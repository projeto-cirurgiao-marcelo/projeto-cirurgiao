'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

interface StaggerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

interface AnimatedTabContentProps {
  children: ReactNode;
  activeKey: string;
  className?: string;
}

interface ScaleInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

// Passthrough fallback while framer-motion loads
function Passthrough({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

/**
 * Wraps page content with a fade+slide-up entrance animation.
 * Lazy-loads framer-motion to avoid bloating the initial bundle.
 */
export const PageTransition = dynamic<PageTransitionProps>(
  () =>
    import('framer-motion').then((mod) => {
      const { motion } = mod;
      return function PageTransitionInner({ children, className }: PageTransitionProps) {
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
          >
            {children}
          </motion.div>
        );
      };
    }),
  { ssr: false, loading: () => <Passthrough>{null}</Passthrough> }
) as React.ComponentType<PageTransitionProps>;

/**
 * Stagger container — children animate in sequence.
 */
export const StaggerContainer = dynamic<StaggerProps>(
  () =>
    import('framer-motion').then((mod) => {
      const { motion } = mod;
      return function StaggerContainerInner({ children, className, delay = 0 }: StaggerProps) {
        return (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.06,
                  delayChildren: delay,
                },
              },
            }}
            className={className}
          >
            {children}
          </motion.div>
        );
      };
    }),
  { ssr: false, loading: ({ children }: any) => <Passthrough>{children}</Passthrough> }
) as React.ComponentType<StaggerProps>;

/**
 * Individual stagger item — use inside a <StaggerContainer>.
 */
export const StaggerItem = dynamic<{ children: ReactNode; className?: string }>(
  () =>
    import('framer-motion').then((mod) => {
      const { motion } = mod;
      return function StaggerItemInner({
        children,
        className,
      }: {
        children: ReactNode;
        className?: string;
      }) {
        return (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] },
              },
            }}
            className={className}
          >
            {children}
          </motion.div>
        );
      };
    }),
  { ssr: false, loading: ({ children }: any) => <Passthrough>{children}</Passthrough> }
) as React.ComponentType<{ children: ReactNode; className?: string }>;

/**
 * Fade-in wrapper for sections that should appear smoothly.
 */
export const FadeIn = dynamic<FadeInProps>(
  () =>
    import('framer-motion').then((mod) => {
      const { motion } = mod;
      return function FadeInInner({
        children,
        className,
        delay = 0,
        direction = 'up',
      }: FadeInProps) {
        const directionOffset = {
          up: { y: 16 },
          down: { y: -16 },
          left: { x: 16 },
          right: { x: -16 },
          none: {},
        };
        return (
          <motion.div
            initial={{ opacity: 0, ...directionOffset[direction] }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
          >
            {children}
          </motion.div>
        );
      };
    }),
  { ssr: false, loading: ({ children }: any) => <Passthrough>{children}</Passthrough> }
) as React.ComponentType<FadeInProps>;

/**
 * Animated tab content — use with tab switching.
 */
export const AnimatedTabContent = dynamic<AnimatedTabContentProps>(
  () =>
    import('framer-motion').then((mod) => {
      const { motion } = mod;
      return function AnimatedTabContentInner({
        children,
        activeKey,
        className,
      }: AnimatedTabContentProps) {
        return (
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
          >
            {children}
          </motion.div>
        );
      };
    }),
  { ssr: false, loading: ({ children }: any) => <Passthrough>{children}</Passthrough> }
) as React.ComponentType<AnimatedTabContentProps>;

/**
 * Scale-in animation — good for cards, badges, achievements.
 */
export const ScaleIn = dynamic<ScaleInProps>(
  () =>
    import('framer-motion').then((mod) => {
      const { motion } = mod;
      return function ScaleInInner({ children, className, delay = 0 }: ScaleInProps) {
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay, ease: [0.25, 0.1, 0.25, 1] }}
            className={className}
          >
            {children}
          </motion.div>
        );
      };
    }),
  { ssr: false, loading: ({ children }: any) => <Passthrough>{children}</Passthrough> }
) as React.ComponentType<ScaleInProps>;
