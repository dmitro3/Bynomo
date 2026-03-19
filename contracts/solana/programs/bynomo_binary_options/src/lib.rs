use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Bynm111111111111111111111111111111111111111");

#[program]
pub mod bynomo_binary_options {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        fee_bps: u16,
        min_bet: u64,
        max_bet: u64,
    ) -> Result<()> {
        require!(fee_bps <= 2_000, ErrorCode::InvalidFeeBps);
        require!(min_bet > 0 && min_bet <= max_bet, ErrorCode::InvalidBetLimits);

        let cfg = &mut ctx.accounts.config;
        cfg.authority = ctx.accounts.authority.key();
        cfg.oracle_authority = ctx.accounts.oracle_authority.key();
        cfg.fee_recipient = ctx.accounts.fee_recipient.key();
        cfg.bet_mint = ctx.accounts.bet_mint.key();
        cfg.vault = ctx.accounts.vault.key();
        cfg.fee_bps = fee_bps;
        cfg.min_bet = min_bet;
        cfg.max_bet = max_bet;
        cfg.paused = false;
        cfg.round_nonce = 0;
        Ok(())
    }

    pub fn update_config(
        ctx: Context<UpdateConfig>,
        new_fee_bps: Option<u16>,
        new_min_bet: Option<u64>,
        new_max_bet: Option<u64>,
        new_oracle_authority: Option<Pubkey>,
        new_fee_recipient: Option<Pubkey>,
        pause: Option<bool>,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.config;

        if let Some(fee_bps) = new_fee_bps {
            require!(fee_bps <= 2_000, ErrorCode::InvalidFeeBps);
            cfg.fee_bps = fee_bps;
        }
        if let Some(min_bet) = new_min_bet {
            cfg.min_bet = min_bet;
        }
        if let Some(max_bet) = new_max_bet {
            cfg.max_bet = max_bet;
        }
        require!(cfg.min_bet > 0 && cfg.min_bet <= cfg.max_bet, ErrorCode::InvalidBetLimits);

        if let Some(pk) = new_oracle_authority {
            cfg.oracle_authority = pk;
        }
        if let Some(pk) = new_fee_recipient {
            cfg.fee_recipient = pk;
        }
        if let Some(p) = pause {
            cfg.paused = p;
        }
        Ok(())
    }

    pub fn create_round(
        ctx: Context<CreateRound>,
        asset_symbol: String,
        strike_price_e8: i64,
        settle_after_ts: i64,
        expiry_ts: i64,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        require!(!cfg.paused, ErrorCode::ProtocolPaused);
        require!(asset_symbol.len() <= 16, ErrorCode::AssetSymbolTooLong);
        let now = Clock::get()?.unix_timestamp;
        require!(settle_after_ts > now, ErrorCode::InvalidWindow);
        require!(expiry_ts > settle_after_ts, ErrorCode::InvalidWindow);

        cfg.round_nonce = cfg.round_nonce.checked_add(1).ok_or(ErrorCode::MathOverflow)?;

        let round = &mut ctx.accounts.round;
        round.config = cfg.key();
        round.round_id = cfg.round_nonce;
        round.asset_symbol = asset_symbol;
        round.strike_price_e8 = strike_price_e8;
        round.settle_price_e8 = 0;
        round.total_up = 0;
        round.total_down = 0;
        round.total_fees = 0;
        round.settle_after_ts = settle_after_ts;
        round.expiry_ts = expiry_ts;
        round.status = RoundStatus::Open;
        round.winning_side = Side::None;
        round.bump = ctx.bumps.round;
        Ok(())
    }

    pub fn place_bet(ctx: Context<PlaceBet>, side: Side, amount: u64) -> Result<()> {
        require!(side == Side::Up || side == Side::Down, ErrorCode::InvalidSide);
        let cfg = &ctx.accounts.config;
        let round = &mut ctx.accounts.round;
        require!(!cfg.paused, ErrorCode::ProtocolPaused);
        require!(round.status == RoundStatus::Open, ErrorCode::RoundNotOpen);
        let now = Clock::get()?.unix_timestamp;
        require!(now < round.settle_after_ts, ErrorCode::BetWindowClosed);
        require!(amount >= cfg.min_bet && amount <= cfg.max_bet, ErrorCode::BetOutOfRange);

        // Transfer user's token to program vault.
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, amount)?;

        let position = &mut ctx.accounts.position;
        position.user = ctx.accounts.user.key();
        position.round = round.key();
        position.side = side;
        position.amount = amount;
        position.claimed = false;
        position.bump = ctx.bumps.position;

        if side == Side::Up {
            round.total_up = round.total_up.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
        } else {
            round.total_down = round.total_down.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
        }
        Ok(())
    }

    pub fn lock_round(ctx: Context<LockRound>) -> Result<()> {
        let round = &mut ctx.accounts.round;
        require!(round.status == RoundStatus::Open, ErrorCode::RoundNotOpen);
        let now = Clock::get()?.unix_timestamp;
        require!(now >= round.settle_after_ts, ErrorCode::TooEarlyToLock);
        round.status = RoundStatus::Locked;
        Ok(())
    }

    pub fn settle_round(ctx: Context<SettleRound>, settle_price_e8: i64) -> Result<()> {
        let round = &mut ctx.accounts.round;
        require!(
            round.status == RoundStatus::Open || round.status == RoundStatus::Locked,
            ErrorCode::RoundNotSettleable
        );
        let now = Clock::get()?.unix_timestamp;
        require!(now >= round.settle_after_ts, ErrorCode::TooEarlyToSettle);

        round.settle_price_e8 = settle_price_e8;
        round.status = RoundStatus::Settled;

        if settle_price_e8 > round.strike_price_e8 {
            round.winning_side = Side::Up;
        } else if settle_price_e8 < round.strike_price_e8 {
            round.winning_side = Side::Down;
        } else {
            round.winning_side = Side::None; // Tie => both sides can claim principal only.
        }

        // Fee is charged on losing pool only.
        let losing_pool = match round.winning_side {
            Side::Up => round.total_down,
            Side::Down => round.total_up,
            Side::None => 0,
        };
        let fee = losing_pool
            .checked_mul(ctx.accounts.config.fee_bps as u64)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(10_000)
            .ok_or(ErrorCode::MathOverflow)?;
        round.total_fees = fee;

        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let cfg = &ctx.accounts.config;
        let round = &ctx.accounts.round;
        let position = &mut ctx.accounts.position;

        require!(round.status == RoundStatus::Settled, ErrorCode::RoundNotSettled);
        require!(!position.claimed, ErrorCode::AlreadyClaimed);
        require!(position.user == ctx.accounts.user.key(), ErrorCode::Unauthorized);

        let payout = calculate_payout(round, position, cfg.fee_bps)?;
        require!(payout > 0, ErrorCode::NoPayout);

        // Program signer for vault.
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"config",
            cfg.authority.as_ref(),
            &[cfg.bump],
        ]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user_token.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(cpi_ctx, payout)?;

        position.claimed = true;
        Ok(())
    }

    pub fn collect_fees(ctx: Context<CollectFees>) -> Result<()> {
        let round = &mut ctx.accounts.round;
        require!(round.status == RoundStatus::Settled, ErrorCode::RoundNotSettled);
        require!(round.total_fees > 0, ErrorCode::NoFees);

        let cfg = &ctx.accounts.config;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"config",
            cfg.authority.as_ref(),
            &[cfg.bump],
        ]];

        let amount = round.total_fees;
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.fee_recipient_token.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        round.total_fees = 0;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: trusted key configured by authority.
    pub oracle_authority: UncheckedAccount<'info>,
    /// CHECK: trusted key configured by authority.
    pub fee_recipient: UncheckedAccount<'info>,
    pub bet_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = 8 + Config::SIZE,
        seeds = [b"config", authority.key().as_ref()],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = authority,
        token::mint = bet_mint,
        token::authority = config
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut, has_one = authority)]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateRound<'info> {
    #[account(mut, has_one = authority)]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Round::SIZE,
        seeds = [b"round", config.key().as_ref(), (config.round_nonce + 1).to_le_bytes().as_ref()],
        bump
    )]
    pub round: Account<'info, Round>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub config: Account<'info, Config>,
    #[account(mut, has_one = config)]
    pub round: Account<'info, Round>,
    #[account(
        mut,
        constraint = user_token.owner == user.key(),
        constraint = user_token.mint == config.bet_mint
    )]
    pub user_token: Account<'info, TokenAccount>,
    #[account(mut, address = config.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = user,
        space = 8 + Position::SIZE,
        seeds = [b"position", round.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LockRound<'info> {
    #[account(has_one = oracle_authority)]
    pub config: Account<'info, Config>,
    pub oracle_authority: Signer<'info>,
    #[account(mut, has_one = config)]
    pub round: Account<'info, Round>,
}

#[derive(Accounts)]
pub struct SettleRound<'info> {
    #[account(has_one = oracle_authority)]
    pub config: Account<'info, Config>,
    pub oracle_authority: Signer<'info>,
    #[account(mut, has_one = config)]
    pub round: Account<'info, Round>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub config: Account<'info, Config>,
    #[account(has_one = config)]
    pub round: Account<'info, Round>,
    #[account(
        mut,
        seeds = [b"position", round.key().as_ref(), user.key().as_ref()],
        bump = position.bump
    )]
    pub position: Account<'info, Position>,
    #[account(mut, address = config.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_token.owner == user.key(),
        constraint = user_token.mint == config.bet_mint
    )]
    pub user_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CollectFees<'info> {
    #[account(mut, has_one = authority, has_one = fee_recipient)]
    pub config: Account<'info, Config>,
    pub authority: Signer<'info>,
    /// CHECK: validated via has_one.
    pub fee_recipient: UncheckedAccount<'info>,
    #[account(mut, has_one = config)]
    pub round: Account<'info, Round>,
    #[account(mut, address = config.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = fee_recipient_token.owner == fee_recipient.key(),
        constraint = fee_recipient_token.mint == config.bet_mint
    )]
    pub fee_recipient_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub oracle_authority: Pubkey,
    pub fee_recipient: Pubkey,
    pub bet_mint: Pubkey,
    pub vault: Pubkey,
    pub fee_bps: u16,
    pub min_bet: u64,
    pub max_bet: u64,
    pub paused: bool,
    pub round_nonce: u64,
    pub bump: u8,
}

impl Config {
    pub const SIZE: usize = 32 + 32 + 32 + 32 + 32 + 2 + 8 + 8 + 1 + 8 + 1;
}

#[account]
pub struct Round {
    pub config: Pubkey,
    pub round_id: u64,
    pub asset_symbol: String, // Max 16 chars
    pub strike_price_e8: i64,
    pub settle_price_e8: i64,
    pub total_up: u64,
    pub total_down: u64,
    pub total_fees: u64,
    pub settle_after_ts: i64,
    pub expiry_ts: i64,
    pub status: RoundStatus,
    pub winning_side: Side,
    pub bump: u8,
}

impl Round {
    pub const SIZE: usize = 32 + 8 + (4 + 16) + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 1 + 1;
}

#[account]
pub struct Position {
    pub user: Pubkey,
    pub round: Pubkey,
    pub side: Side,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

impl Position {
    pub const SIZE: usize = 32 + 32 + 1 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    None,
    Up,
    Down,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RoundStatus {
    Open,
    Locked,
    Settled,
    Cancelled,
}

fn calculate_payout(round: &Round, position: &Position, fee_bps: u16) -> Result<u64> {
    if round.winning_side == Side::None {
        return Ok(position.amount); // Tie: principal refund.
    }
    if position.side != round.winning_side {
        return Ok(0);
    }

    let winners_pool = if round.winning_side == Side::Up {
        round.total_up
    } else {
        round.total_down
    };
    let losers_pool = if round.winning_side == Side::Up {
        round.total_down
    } else {
        round.total_up
    };
    if winners_pool == 0 {
        return Ok(0);
    }

    let fee = losers_pool
        .checked_mul(fee_bps as u64)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(10_000)
        .ok_or(ErrorCode::MathOverflow)?;
    let distributable = losers_pool.checked_sub(fee).ok_or(ErrorCode::MathOverflow)?;
    let share = distributable
        .checked_mul(position.amount)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(winners_pool)
        .ok_or(ErrorCode::MathOverflow)?;
    position
        .amount
        .checked_add(share)
        .ok_or(ErrorCode::MathOverflow.into())
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid fee bps")]
    InvalidFeeBps,
    #[msg("Invalid minimum/maximum bet limits")]
    InvalidBetLimits,
    #[msg("Protocol is paused")]
    ProtocolPaused,
    #[msg("Asset symbol too long")]
    AssetSymbolTooLong,
    #[msg("Invalid round window")]
    InvalidWindow,
    #[msg("Round is not open")]
    RoundNotOpen,
    #[msg("Bet window closed")]
    BetWindowClosed,
    #[msg("Bet amount out of range")]
    BetOutOfRange,
    #[msg("Too early to lock round")]
    TooEarlyToLock,
    #[msg("Too early to settle round")]
    TooEarlyToSettle,
    #[msg("Round cannot be settled in current state")]
    RoundNotSettleable,
    #[msg("Round not settled")]
    RoundNotSettled,
    #[msg("Position already claimed")]
    AlreadyClaimed,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("No payout available")]
    NoPayout,
    #[msg("No fees to collect")]
    NoFees,
    #[msg("Invalid side")]
    InvalidSide,
    #[msg("Math overflow")]
    MathOverflow,
}

