'use client';

import React, { useState } from 'react';
import GridScan from '@/components/ui/GridScan';
import TrueFocus from '@/components/ui/TrueFocus';
import './waitlist.css';
import { motion, AnimatePresence } from 'framer-motion';

export default function WaitlistPage() {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || isSubmitting) return;

        setIsSubmitting(true);

        // Simulate API call
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setIsSubmitted(true);
        } catch (error) {
            console.error('Waitlist submission error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isExpanded = isHovered || email.length > 0;

    return (
        <main className="waitlist-container">
            <div className="waitlist-bg">
                <GridScan
                    sensitivity={0.01}
                    lineThickness={1}
                    linesColor="#0d0d12"
                    gridScale={0.1}
                    scanColor="#FF9FFC"
                    scanOpacity={0.03}
                    scanDuration={16.0}
                    enablePost
                    bloomIntensity={0.05}
                    chromaticAberration={0.0001}
                    noiseIntensity={0.01}
                />
            </div>

            <div className="waitlist-content">
                <motion.div
                    className="waitlist-card"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    {!isSubmitted ? (
                        <>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                                style={{ marginBottom: '20px' }}
                            >
                                <TrueFocus
                                    sentence="Binomo | The future of decentralized binary options is coming. Join for exclusive early access and zero trading fees."
                                    separator=" | "
                                    manualMode={false}
                                    blurAmount={10}
                                    borderColor="#FF9FFC"
                                    glowColor="rgba(255, 159, 252, 0.6)"
                                    animationDuration={2.0}
                                    pauseBetweenAnimations={3.0}
                                />
                            </motion.div>

                            <motion.form
                                onSubmit={handleSubmit}
                                className="waitlist-form"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.8 }}
                            >
                                <motion.div
                                    layout
                                    className={`input-container ${isExpanded ? 'expanded' : ''}`}
                                    onMouseEnter={() => setIsHovered(true)}
                                    onMouseLeave={() => setIsHovered(false)}
                                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                    style={{ display: 'flex', alignItems: 'center' }}
                                >
                                    <AnimatePresence initial={false}>
                                        {isExpanded && (
                                            <motion.div
                                                key="input-field"
                                                initial={{ width: 0, opacity: 0 }}
                                                animate={{ width: 220, opacity: 1 }}
                                                exit={{ width: 0, opacity: 0 }}
                                                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <input
                                                    type="email"
                                                    placeholder="name@example.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    required
                                                    className="waitlist-input"
                                                    autoFocus
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <motion.button
                                        layout
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="mini-submit"
                                        style={{ flexShrink: 0 }}
                                    >
                                        {isSubmitting ? '...' : 'Join'}
                                    </motion.button>
                                </motion.div>
                            </motion.form>
                        </>
                    ) : (
                        <div className="success-state">
                            <div className="success-icon">✓</div>
                            <h1 className="waitlist-title" style={{ fontSize: '3rem' }}>Welcome</h1>
                            <p className="waitlist-subtitle">You've been added to the elite list.</p>
                            <button
                                onClick={() => {
                                    setIsSubmitted(false);
                                    setEmail('');
                                }}
                                className="mini-submit"
                                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                            >
                                Back
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </main>
    );
}
