// Dr. Gelpi — personagem fictício original (veterinário experiente)
// SVG composto com partes separadas para animação independente
// Adaptado de Marcelo Portilho/Projeto Cirurgião

'use client';

import React from 'react';

type GelpiState = 'idle' | 'celebrate';

interface Props {
  state?: GelpiState;
}

export default function DrGelpi({ state = 'celebrate' }: Props) {
  return (
    <div className="gelpi-root" data-state={state}>
      <svg viewBox="0 0 400 520" width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="skin-grad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFE0CC" />
            <stop offset="100%" stopColor="#F4B894" />
          </radialGradient>
          <linearGradient id="coat-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#DCE7F2" />
          </linearGradient>
          <linearGradient id="hair-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FAFAFA" />
            <stop offset="100%" stopColor="#C9CDD2" />
          </linearGradient>
          <linearGradient id="tie-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E6FD9" />
            <stop offset="100%" stopColor="#0E4FAA" />
          </linearGradient>
          <linearGradient id="shirt-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A8CDF0" />
            <stop offset="100%" stopColor="#7FB0DD" />
          </linearGradient>
          <radialGradient id="cheek-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF9A8B" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#FF9A8B" stopOpacity="0" />
          </radialGradient>
          <filter id="soft-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        <ellipse
          className="ground-shadow"
          cx="200" cy="500" rx="100" ry="14"
          fill="#0E4FAA" opacity="0.18"
        />

        <g className="body-group">
          <g className="legs">
            <path d="M170 440 L165 488 Q165 495 175 495 L195 495 Q200 495 200 488 L200 440 Z" fill="#5C3A24" />
            <path d="M200 440 L200 488 Q200 495 205 495 L225 495 Q235 495 235 488 L230 440 Z" fill="#6B4528" />
            <ellipse cx="183" cy="495" rx="22" ry="8" fill="#3A2414" />
            <ellipse cx="217" cy="495" rx="22" ry="8" fill="#3A2414" />
          </g>

          <path
            d="M120 260 Q120 240 145 235 L165 232 Q180 270 200 270 Q220 270 235 232 L255 235 Q280 240 280 260 L290 450 Q290 460 280 460 L120 460 Q110 460 110 450 Z"
            fill="url(#coat-grad)"
            stroke="#B8C8D8" strokeWidth="2"
          />

          <path
            d="M165 232 Q180 290 200 290 Q220 290 235 232 L225 240 Q220 280 200 280 Q180 280 175 240 Z"
            fill="url(#shirt-grad)"
          />

          <path
            d="M195 240 L205 240 L208 250 L203 320 L200 330 L197 320 L192 250 Z"
            fill="url(#tie-grad)"
          />
          <path d="M195 240 L205 240 L207 248 L193 248 Z" fill="#0A3D80" />

          <rect x="135" y="340" width="38" height="42" rx="3" fill="none" stroke="#C5D2E0" strokeWidth="2" />
          <rect x="142" y="335" width="4" height="18" rx="1" fill="#1E6FD9" />
          <rect x="150" y="335" width="4" height="18" rx="1" fill="#E84D4D" />

          <g className="stethoscope">
            <path
              d="M170 250 Q150 280 145 320 Q142 350 165 365 Q190 380 210 365 Q230 350 228 325"
              fill="none" stroke="#2A2A2A" strokeWidth="6" strokeLinecap="round"
            />
            <path
              d="M228 325 Q228 320 232 318"
              fill="none" stroke="#2A2A2A" strokeWidth="6" strokeLinecap="round"
            />
            <circle cx="237" cy="318" r="14" fill="#C0C0C0" stroke="#7A7A7A" strokeWidth="2" />
            <circle cx="237" cy="318" r="9" fill="#5A5A5A" />
            <circle cx="234" cy="315" r="3" fill="#9A9A9A" />
          </g>

          <g className="arm-left">
            <path
              d="M125 270 Q108 320 112 380 Q114 410 130 415 Q145 415 145 395 Q145 350 145 300 Q145 275 125 270 Z"
              fill="url(#coat-grad)" stroke="#B8C8D8" strokeWidth="2"
            />
            <circle cx="132" cy="412" r="14" fill="url(#skin-grad)" stroke="#D49A77" strokeWidth="1.5" />
          </g>

          <g className="arm-right">
            <path
              d="M275 270 Q295 290 290 250 Q288 220 275 200 Q260 195 252 215 Q250 240 255 270 Z"
              fill="url(#coat-grad)" stroke="#B8C8D8" strokeWidth="2"
            />
            <ellipse cx="287" cy="200" rx="14" ry="6" fill="#A8CDF0" />

            <g className="thumbs-up">
              <ellipse cx="287" cy="190" rx="16" ry="14" fill="url(#skin-grad)" stroke="#D49A77" strokeWidth="1.5" />
              <path d="M278 188 Q282 184 286 188" stroke="#D49A77" strokeWidth="1.5" fill="none" />
              <path d="M278 194 Q282 198 286 194" stroke="#D49A77" strokeWidth="1.5" fill="none" />
              <path
                d="M290 180 Q288 160 292 148 Q298 140 304 146 Q306 160 302 178 Q298 184 290 182 Z"
                fill="url(#skin-grad)" stroke="#D49A77" strokeWidth="1.5"
              />
              <ellipse cx="298" cy="150" rx="3" ry="2" fill="#FFE8DA" />
            </g>
          </g>
        </g>

        <g className="head-group">
          <path d="M180 215 L180 245 Q200 255 220 245 L220 215 Z"
            fill="url(#skin-grad)" stroke="#D49A77" strokeWidth="1.5" />

          <ellipse cx="135" cy="155" rx="10" ry="14" fill="url(#skin-grad)" stroke="#D49A77" strokeWidth="1.5" />
          <ellipse cx="265" cy="155" rx="10" ry="14" fill="url(#skin-grad)" stroke="#D49A77" strokeWidth="1.5" />
          <path d="M132 153 Q137 158 140 153" stroke="#D49A77" strokeWidth="1.2" fill="none" />
          <path d="M260 153 Q265 158 268 153" stroke="#D49A77" strokeWidth="1.2" fill="none" />

          <path
            d="M140 160 Q135 110 175 90 Q200 80 225 90 Q265 110 260 160 Q260 200 240 215 Q220 225 200 225 Q180 225 160 215 Q140 200 140 160 Z"
            fill="url(#skin-grad)" stroke="#D49A77" strokeWidth="1.5"
          />

          <g className="hair">
            <path
              d="M135 130 Q120 90 145 70 Q160 55 180 60 Q195 50 220 60 Q245 55 260 75 Q275 95 270 130 Q260 110 245 105 Q235 95 220 100 Q205 92 195 100 Q180 95 165 105 Q150 108 135 130 Z"
              fill="url(#hair-grad)" stroke="#9CA3AB" strokeWidth="1.5"
            />
            <path d="M130 135 Q120 145 125 165 Q132 158 138 150 Z" fill="url(#hair-grad)" stroke="#9CA3AB" strokeWidth="1.5" />
            <path d="M270 135 Q280 145 275 165 Q268 158 262 150 Z" fill="url(#hair-grad)" stroke="#9CA3AB" strokeWidth="1.5" />
            <path d="M180 60 Q190 50 205 58 Q200 70 188 70 Z" fill="#FFFFFF" stroke="#9CA3AB" strokeWidth="1.2" />
          </g>

          <g className="eyebrows">
            <path className="brow-l" d="M158 142 Q175 132 192 142" stroke="#E8ECF0" strokeWidth="7" strokeLinecap="round" fill="none" />
            <path className="brow-r" d="M208 142 Q225 132 242 142" stroke="#E8ECF0" strokeWidth="7" strokeLinecap="round" fill="none" />
          </g>

          <g className="eyes">
            <ellipse className="eye-white-l" cx="175" cy="160" rx="11" ry="12" fill="#FFFFFF" />
            <ellipse className="eye-white-r" cx="225" cy="160" rx="11" ry="12" fill="#FFFFFF" />
            <circle className="iris-l" cx="176" cy="161" r="5.5" fill="#5C4023" />
            <circle className="iris-r" cx="224" cy="161" r="5.5" fill="#5C4023" />
            <circle cx="176" cy="161" r="2.5" fill="#1A1208" />
            <circle cx="224" cy="161" r="2.5" fill="#1A1208" />
            <circle cx="178" cy="158" r="1.8" fill="#FFFFFF" />
            <circle cx="226" cy="158" r="1.8" fill="#FFFFFF" />
          </g>

          <g className="glasses">
            <circle cx="175" cy="161" r="20" fill="none" stroke="#2A2A2A" strokeWidth="3" />
            <circle cx="225" cy="161" r="20" fill="none" stroke="#2A2A2A" strokeWidth="3" />
            <line x1="195" y1="161" x2="205" y2="161" stroke="#2A2A2A" strokeWidth="3" />
            <line x1="155" y1="161" x2="142" y2="158" stroke="#2A2A2A" strokeWidth="3" strokeLinecap="round" />
            <line x1="245" y1="161" x2="258" y2="158" stroke="#2A2A2A" strokeWidth="3" strokeLinecap="round" />
            <path d="M165 152 Q172 148 180 152" stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity="0.6" />
            <path d="M215 152 Q222 148 230 152" stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity="0.6" />
          </g>

          <ellipse className="cheek-l" cx="160" cy="190" rx="14" ry="9" fill="url(#cheek-grad)" />
          <ellipse className="cheek-r" cx="240" cy="190" rx="14" ry="9" fill="url(#cheek-grad)" />

          <path
            d="M195 175 Q200 195 205 175 Q210 188 200 200 Q190 188 195 175 Z"
            fill="#F4B894" stroke="#D49A77" strokeWidth="1.2"
          />
          <ellipse cx="197" cy="195" rx="2" ry="1.2" fill="#D49A77" />
          <ellipse cx="203" cy="195" rx="2" ry="1.2" fill="#D49A77" />

          <g className="mustache">
            <path
              d="M165 205 Q175 198 195 202 Q200 205 205 202 Q225 198 235 205 Q230 215 215 215 Q205 213 200 215 Q195 213 185 215 Q170 215 165 205 Z"
              fill="#FAFAFA" stroke="#9CA3AB" strokeWidth="1.5"
            />
            <path d="M175 205 L172 212" stroke="#C9CDD2" strokeWidth="1" />
            <path d="M183 205 L181 213" stroke="#C9CDD2" strokeWidth="1" />
            <path d="M218 205 L220 213" stroke="#C9CDD2" strokeWidth="1" />
            <path d="M226 205 L228 212" stroke="#C9CDD2" strokeWidth="1" />
          </g>

          <g className="mouth-group">
            <path className="mouth-open"
              d="M183 218 Q200 235 217 218 Q215 230 200 232 Q185 230 183 218 Z"
              fill="#5A2424" stroke="#3A1414" strokeWidth="1.5"
            />
            <path className="teeth"
              d="M188 220 Q200 226 212 220 Q210 224 200 225 Q190 224 188 220 Z"
              fill="#FFFFFF"
            />
            <ellipse className="tongue" cx="200" cy="228" rx="6" ry="3" fill="#E84D6E" />
          </g>
        </g>
      </svg>
    </div>
  );
}
