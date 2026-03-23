'use client';

import { useState } from 'react';
import type { UserRole } from '@/lib/types';

interface RoleSelectorProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const ROLE_CONFIG = {
  anon: {
    label: 'Guest',
    icon: '👤',
    color: 'var(--role-anon)',
    description: 'View newsletter & FAQs',
  },
  authenticated: {
    label: 'Customer',
    icon: '🔑',
    color: 'var(--role-auth)',
    description: 'Submit tickets & book appointments',
  },
  admin: {
    label: 'Admin',
    icon: '⚡',
    color: 'var(--role-admin)',
    description: 'Full system access',
  },
} as const;

export default function RoleSelector({ currentRole, onRoleChange }: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="role-selector">
      <button
        className="role-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{ '--role-color': ROLE_CONFIG[currentRole].color } as React.CSSProperties}
      >
        <span className="role-icon">{ROLE_CONFIG[currentRole].icon}</span>
        <span className="role-label">{ROLE_CONFIG[currentRole].label}</span>
        <span className="role-chevron">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="role-dropdown">
          {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(
            ([role, config]) => (
              <button
                key={role}
                className={`role-option ${role === currentRole ? 'active' : ''}`}
                onClick={() => {
                  onRoleChange(role);
                  setIsOpen(false);
                }}
                style={{ '--role-color': config.color } as React.CSSProperties}
              >
                <span className="role-option-icon">{config.icon}</span>
                <div className="role-option-text">
                  <span className="role-option-label">{config.label}</span>
                  <span className="role-option-desc">{config.description}</span>
                </div>
                {role === currentRole && <span className="role-check">✓</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
