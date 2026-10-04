import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ANIMATION } from '../../shared/utils/constants';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'success',
  children,
  className = '',
}) => {
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (variant !== 'danger' || !badgeRef.current) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.to(badgeRef.current, {
        scale: ANIMATION.BADGE.DANGER_SCALE,
        opacity: ANIMATION.BADGE.DANGER_OPACITY,
        duration: ANIMATION.BADGE.PULSE_DURATION,
        repeat: -1,
        yoyo: true,
        ease: ANIMATION.EASING.GSAP,
      });
    }, badgeRef);

    return () => {
      ctx.revert();
    };
  }, [variant]);

  const variantStyles = {
    success: 'bg-green-50 text-success border-green-200',
    warning: 'bg-amber-50 text-warning border-amber-200',
    danger: 'bg-red-50 text-danger border-red-200',
  };

  return (
    <span
      ref={badgeRef}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${variantStyles[variant]} ${className}`}
    >
      {variant === 'danger' && (
        <span className="w-1.5 h-1.5 rounded-full bg-danger mr-1.5 shrink-0" />
      )}
      {children}
    </span>
  );
};
