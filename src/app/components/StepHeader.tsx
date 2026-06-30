import React from 'react';

interface StepHeaderProps {
  currentStep: number; // 1, 2, or 3
}

const STEPS = [
  { num: 1, label: 'Detail',  icon: 'inventory_2' },
  { num: 2, label: 'Rute',    icon: 'alt_route'   },
  { num: 3, label: 'Pesan',   icon: 'group'        },
];

export const StepHeader: React.FC<StepHeaderProps> = ({ currentStep }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '14px 20px',
      background: '#ffffff',
      borderRadius: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #e2e8f0',
      margin: '0 2px',
      position: 'relative',
    }}>
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.num;
        const isActive    = currentStep === step.num;

        return (
          <React.Fragment key={step.num}>
            {/* Step Node */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', zIndex: 2 }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: (isActive || isCompleted)
                  ? 'linear-gradient(135deg, #8eadf0 0%, #2091e7 100%)'
                  : '#f0f4f9',
                border: (isActive || isCompleted) ? 'none' : '2px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isActive ? '0 4px 12px rgba(32,145,231,0.35)' : 'none',
                transition: 'all 0.3s ease',
              }}>
                {isCompleted ? (
                  <span className="material-icons" style={{ fontSize: '18px', color: '#ffffff' }}>check</span>
                ) : (
                  <span className="material-icons" style={{
                    fontSize: '18px',
                    color: isActive ? '#ffffff' : '#94a3b8',
                    transition: 'color 0.3s',
                  }}>
                    {step.icon}
                  </span>
                )}
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#2091e7' : isCompleted ? '#64748b' : '#94a3b8',
                letterSpacing: '0.2px',
              }}>
                {step.label}
              </span>
            </div>

            {/* Connector Line (between steps) */}
            {idx < STEPS.length - 1 && (
              <div style={{
                flex: 1,
                height: '2px',
                margin: '0 8px',
                marginTop: '-14px', // align with circle center
                background: currentStep > step.num
                  ? 'linear-gradient(90deg, #8eadf0, #2091e7)'
                  : '#e2e8f0',
                borderRadius: '1px',
                transition: 'background 0.3s',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
export default StepHeader;
