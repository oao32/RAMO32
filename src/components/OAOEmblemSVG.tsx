import React from 'react';

interface OAOEmblemSVGProps {
  className?: string;
  size?: number | string;
  isAnimated?: boolean;
}

export const OAOEmblemSVG: React.FC<OAOEmblemSVGProps> = ({
  className = '',
  size = 280,
  isAnimated = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer ambient aura glow */}
      {isAnimated && (
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/25 via-orange-600/15 to-blue-900/20 rounded-full blur-2xl animate-pulse pointer-events-none" />
      )}

      <svg
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)] transform transition-transform duration-500 hover:scale-105"
      >
        <defs>
          {/* Flame Orange Gradient */}
          <linearGradient id="oaoOrangeGradient" x1="100" y1="50" x2="350" y2="400" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff7800" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>

          {/* Deep Navy Flame Gradient */}
          <linearGradient id="oaoNavyGradient" x1="150" y1="250" x2="350" y2="480" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#070b19" />
          </linearGradient>

          {/* Metallic Silver Arm Gradient */}
          <linearGradient id="oaoArmMetalGrad" x1="120" y1="80" x2="300" y2="350" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="35%" stopColor="#cbd5e1" />
            <stop offset="70%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          {/* Soft Shadow Filter */}
          <filter id="oaoDropGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. TOP & SIDE FIERY ORANGE FLAME WAVES (EXACT CURVES FROM OAO.JPG) */}
        <path
          d="M 190 70 
             C 145 90, 85 155, 75 220 
             C 70 250, 78 280, 95 305 
             C 85 265, 95 210, 125 160 
             C 140 135, 175 95, 205 60 
             C 170 85, 155 125, 150 160 
             C 170 120, 205 90, 245 75 
             Z"
          fill="url(#oaoOrangeGradient)"
          filter="url(#oaoDropGlow)"
        />

        <path
          d="M 125 150 
             C 110 190, 110 240, 130 280 
             C 115 250, 120 205, 140 170 
             C 160 135, 195 105, 235 85 
             Z"
          fill="#f97316"
        />

        {/* Outer Orange Flame Ribbon */}
        <path
          d="M 85 200 
             C 65 240, 68 300, 110 355 
             C 90 320, 85 270, 102 225 
             Z"
          fill="#ea580c"
        />

        {/* 2. INNER ORANGE FLAME SURGES (ABOVE FOREARM & BICEP) */}
        <path
          d="M 230 185 
             C 255 155, 290 145, 340 120 
             C 315 140, 295 170, 290 200 
             C 320 170, 345 155, 370 145 
             C 345 180, 310 230, 255 240 
             C 270 215, 260 195, 230 185 
             Z"
          fill="url(#oaoOrangeGradient)"
        />

        {/* 3. DEEP NAVY BLUE FLAME RIBBONS (LOWER SWEEP AS IN OAO.JPG) */}
        <path
          d="M 120 340 
             C 140 375, 185 410, 245 405 
             C 295 400, 330 370, 345 350 
             C 315 375, 265 390, 215 380 
             C 175 370, 145 345, 120 310 
             C 115 330, 110 360, 140 395 
             C 170 430, 225 445, 285 435 
             C 340 425, 375 390, 395 360 
             C 365 395, 310 420, 250 415 
             C 195 410, 155 385, 120 340 
             Z"
          fill="url(#oaoNavyGradient)"
        />

        {/* Bottom Lower Orange Ribbon Under Navy Waves */}
        <path
          d="M 155 390 
             C 195 430, 250 445, 310 435 
             C 355 425, 390 400, 410 370 
             C 380 395, 335 415, 285 415 
             C 235 415, 190 395, 155 370 
             C 180 390, 220 405, 265 405 
             C 220 415, 175 405, 155 390 
             Z"
          fill="url(#oaoOrangeGradient)"
        />

        {/* Navy Flame Spike Accent near text */}
        <path
          d="M 320 180 
             C 335 155, 355 145, 375 140 
             C 360 165, 340 215, 325 240 
             C 335 210, 330 190, 320 180 
             Z"
          fill="url(#oaoNavyGradient)"
        />

        {/* 4. METALLIC MUSCULAR ARM & CLENCHED FIST SILHOUETTE */}
        {/* Main Bicep & Arm Muscle Base */}
        <path
          d="M 100 240 
             C 90 200, 110 145, 145 105 
             C 185 65, 240 68, 275 90 
             C 285 97, 290 115, 275 125 
             C 260 135, 240 130, 225 125 
             C 245 130, 270 140, 285 160 
             C 295 175, 290 195, 275 200 
             C 255 208, 230 190, 215 175 
             C 230 200, 245 235, 235 265 
             C 225 295, 185 340, 150 340 
             C 120 340, 105 290, 100 240 
             Z"
          fill="url(#oaoArmMetalGrad)"
        />

        {/* Forearm and Clenched Fist Contour */}
        <path
          d="M 235 70 
             C 260 65, 285 75, 305 100 
             C 315 115, 320 135, 310 145 
             C 298 155, 280 150, 270 140 
             C 282 145, 295 155, 295 170 
             C 295 185, 280 190, 265 180 
             C 255 172, 245 160, 235 145 
             Z"
          fill="#cbd5e1"
        />

        {/* Clenched Fist Knuckles Definition */}
        <path
          d="M 270 85 
             C 285 78, 298 85, 305 95 
             C 312 105, 310 118, 300 125 
             C 292 118, 285 110, 275 105 
             Z"
          fill="#94a3b8"
        />
        <path
          d="M 285 92 C 295 88, 305 92, 308 100"
          stroke="#475569"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 280 105 C 290 102, 300 105, 305 112"
          stroke="#475569"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Muscle Highlight Striation (White Gleam) */}
        <path
          d="M 175 180 
             C 195 140, 230 115, 255 110 
             C 230 130, 210 170, 195 210 
             Z"
          fill="#ffffff"
          opacity="0.9"
        />

        {/* Bicep Peak Muscle Curve */}
        <path
          d="M 160 215 
             C 175 175, 205 150, 230 150 
             C 210 175, 190 215, 175 250 
             Z"
          fill="#ffffff"
          opacity="0.75"
        />

        {/* 5. TYPOGRAPHY: EXACT INTEGRATION AS IN OAO.JPG */}
        {/* 'OWN' text in dark navy spaced serif capitals */}
        <text
          x="300"
          y="255"
          fill="#0b192c"
          fontFamily="'Outfit', 'Alexandria', sans-serif"
          fontWeight="700"
          fontSize="34"
          letterSpacing="12"
        >
          OWN
        </text>

        {/* 'AURA' text in massive bold athletic navy stencil letters */}
        <text
          x="240"
          y="318"
          fill="#07182E"
          stroke="#ffffff"
          strokeWidth="1.5"
          fontFamily="'Outfit', 'Impact', sans-serif"
          fontWeight="900"
          fontSize="68"
          letterSpacing="4"
          className="drop-shadow-[0_2px_10px_rgba(7,24,46,0.5)]"
        >
          AURA
        </text>

        {/* Stencil horizontal cut simulation for 'A' in AURA */}
        <line x1="242" y1="298" x2="280" y2="298" stroke="#ffffff" strokeWidth="4" />
        <line x1="390" y1="298" x2="428" y2="298" stroke="#ffffff" strokeWidth="4" />

        {/* 'OUTCOME' text in athletic bright orange spaced capitals */}
        <text
          x="270"
          y="345"
          fill="#ea580c"
          fontFamily="'Outfit', 'Alexandria', sans-serif"
          fontWeight="800"
          fontSize="20"
          letterSpacing="8"
        >
          OUTCOME
        </text>
      </svg>
    </div>
  );
};
