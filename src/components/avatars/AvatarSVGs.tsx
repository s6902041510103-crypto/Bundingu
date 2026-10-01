export function Avatar({ avatarId }: { avatarId: string }) {
  switch (avatarId) {
    case 'avatar-01':
      return <Avatar01 />;
    case 'avatar-02':
      return <Avatar02 />;
    case 'avatar-03':
      return <Avatar03 />;
    case 'avatar-04':
      return <Avatar04 />;
    case 'avatar-05':
      return <Avatar05 />;
    case 'avatar-06':
      return <Avatar06 />;
    case 'avatar-07':
      return <Avatar07 />;
    case 'avatar-08':
      return <Avatar08 />;
    case 'avatar-09':
      return <Avatar09 />;
    case 'avatar-10':
      return <Avatar10 />;
    case 'avatar-11':
      return <Avatar11 />;
    case 'avatar-12':
      return <Avatar12 />;
    default:
      return <AvatarFallback />;
  }
}

function Avatar01() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="cat-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="55" r="28" fill="url(#cat-gradient)" />
      <ellipse cx="35" cy="38" rx="10" ry="14" fill="url(#cat-gradient)" />
      <ellipse cx="65" cy="38" rx="10" ry="14" fill="url(#cat-gradient)" />
      <polygon points="35,30 40,18 45,30" fill="url(#cat-gradient)" />
      <polygon points="55,30 60,18 65,30" fill="url(#cat-gradient)" />
      <ellipse cx="45" cy="48" rx="4" ry="5" fill="#1e293b" />
      <ellipse cx="55" cy="48" rx="4" ry="5" fill="#1e293b" />
      <path d="M50 55 Q50 58 46 60 M50 55 Q50 58 54 60" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g stroke="#c2410c" strokeWidth="1.5" strokeLinecap="round">
        <line x1="32" y1="50" x2="22" y2="48" />
        <line x1="32" y1="55" x2="22" y2="56" />
        <line x1="68" y1="50" x2="78" y2="48" />
        <line x1="68" y1="55" x2="78" y2="56" />
      </g>
    </svg>
  );
}

function Avatar02() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="dog-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="58" rx="26" ry="22" fill="url(#dog-gradient)" />
      <ellipse cx="50" cy="38" rx="18" ry="16" fill="url(#dog-gradient)" />
      <ellipse cx="30" cy="30" rx="9" ry="12" fill="url(#dog-gradient)" />
      <ellipse cx="70" cy="30" rx="9" ry="12" fill="url(#dog-gradient)" />
      <ellipse cx="42" cy="42" rx="3.5" ry="4" fill="#1e293b" />
      <ellipse cx="58" cy="42" rx="3.5" ry="4" fill="#1e293b" />
      <ellipse cx="50" cy="50" rx="5" ry="3.5" fill="#1e293b" />
      <path d="M45 53 Q50 58 55 53" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="38" cy="62" rx="4" ry="3" fill="#fde68a" />
      <ellipse cx="62" cy="62" rx="4" ry="3" fill="#fde68a" />
    </svg>
  );
}

function Avatar03() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="rabbit-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="60" rx="24" ry="20" fill="url(#rabbit-gradient)" stroke="#cbd5e1" strokeWidth="1" />
      <ellipse cx="50" cy="40" rx="16" ry="14" fill="url(#rabbit-gradient)" stroke="#cbd5e1" strokeWidth="1" />
      <ellipse cx="32" cy="25" rx="6" ry="18" fill="url(#rabbit-gradient)" stroke="#cbd5e1" strokeWidth="1" />
      <ellipse cx="68" cy="25" rx="6" ry="18" fill="url(#rabbit-gradient)" stroke="#cbd5e1" strokeWidth="1" />
      <ellipse cx="33" cy="20" rx="3" ry="12" fill="#fee2e2" />
      <ellipse cx="67" cy="20" rx="3" ry="12" fill="#fee2e2" />
      <circle cx="44" cy="40" r="3" fill="#1e293b" />
      <circle cx="56" cy="40" r="3" fill="#1e293b" />
      <ellipse cx="50" cy="48" rx="2.5" ry="2" fill="#fecaca" />
      <path d="M48 50 Q50 54 52 50" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <g stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round">
        <line x1="35" y1="48" x2="26" y2="46" />
        <line x1="35" y1="52" x2="26" y2="54" />
        <line x1="65" y1="48" x2="74" y2="46" />
        <line x1="65" y1="52" x2="74" y2="54" />
      </g>
    </svg>
  );
}

function Avatar04() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="blackrabbit-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="60" rx="24" ry="20" fill="url(#blackrabbit-gradient)" stroke="#4b5563" strokeWidth="1" />
      <ellipse cx="50" cy="40" rx="16" ry="14" fill="url(#blackrabbit-gradient)" stroke="#4b5563" strokeWidth="1" />
      <ellipse cx="32" cy="25" rx="6" ry="18" fill="url(#blackrabbit-gradient)" stroke="#4b5563" strokeWidth="1" />
      <ellipse cx="68" cy="25" rx="6" ry="18" fill="url(#blackrabbit-gradient)" stroke="#4b5563" strokeWidth="1" />
      <ellipse cx="33" cy="20" rx="3" ry="12" fill="#fecaca" />
      <ellipse cx="67" cy="20" rx="3" ry="12" fill="#fecaca" />
      <circle cx="44" cy="40" r="3" fill="#f3f4f6" />
      <circle cx="56" cy="40" r="3" fill="#f3f4f6" />
      <ellipse cx="50" cy="48" rx="2.5" ry="2" fill="#fecaca" />
      <path d="M48 50 Q50 54 52 50" stroke="#f3f4f6" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <g stroke="#6b7280" strokeWidth="1" strokeLinecap="round">
        <line x1="35" y1="48" x2="26" y2="46" />
        <line x1="35" y1="52" x2="26" y2="54" />
        <line x1="65" y1="48" x2="74" y2="46" />
        <line x1="65" y1="52" x2="74" y2="54" />
      </g>
    </svg>
  );
}

function Avatar05() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="panda-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="58" rx="28" ry="24" fill="url(#panda-gradient)" stroke="#94a3b8" strokeWidth="1" />
      <ellipse cx="50" cy="35" rx="20" ry="18" fill="url(#panda-gradient)" stroke="#94a3b8" strokeWidth="1" />
      <ellipse cx="28" cy="22" rx="10" ry="12" fill="#1e293b" />
      <ellipse cx="72" cy="22" rx="10" ry="12" fill="#1e293b" />
      <ellipse cx="40" cy="36" rx="7" ry="8" fill="#1e293b" />
      <ellipse cx="60" cy="36" rx="7" ry="8" fill="#1e293b" />
      <circle cx="38" cy="34" r="2" fill="#f8fafc" />
      <circle cx="62" cy="34" r="2" fill="#f8fafc" />
      <ellipse cx="50" cy="46" rx="5" ry="3" fill="#1e293b" />
      <path d="M45 50 Q50 55 55 50" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="40" cy="62" rx="8" ry="5" fill="#1e293b" />
      <ellipse cx="60" cy="62" rx="8" ry="5" fill="#1e293b" />
    </svg>
  );
}

function Avatar06() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="bear-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a16207" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="62" rx="30" ry="24" fill="url(#bear-gradient)" />
      <ellipse cx="50" cy="38" rx="22" ry="18" fill="url(#bear-gradient)" />
      <ellipse cx="28" cy="22" rx="11" ry="13" fill="url(#bear-gradient)" />
      <ellipse cx="72" cy="22" rx="11" ry="13" fill="url(#bear-gradient)" />
      <ellipse cx="28" cy="20" rx="5" ry="6" fill="#fef3c7" />
      <ellipse cx="72" cy="20" rx="5" ry="6" fill="#fef3c7" />
      <circle cx="42" cy="38" r="3.5" fill="#1e293b" />
      <circle cx="58" cy="38" r="3.5" fill="#1e293b" />
      <ellipse cx="50" cy="48" rx="6" ry="4" fill="#1e293b" />
      <path d="M45 53 Q50 58 55 53" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="38" cy="64" rx="6" ry="4" fill="#fde68a" />
      <ellipse cx="62" cy="64" rx="6" ry="4" fill="#fde68a" />
    </svg>
  );
}

function Avatar07() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="fox-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="58" rx="26" ry="22" fill="url(#fox-gradient)" />
      <ellipse cx="50" cy="36" rx="18" ry="16" fill="url(#fox-gradient)" />
      <polygon points="32,30 38,18 44,30" fill="url(#fox-gradient)" />
      <polygon points="56,30 62,18 68,30" fill="url(#fox-gradient)" />
      <ellipse cx="28" cy="28" rx="6" ry="8" fill="#fef3c7" />
      <ellipse cx="72" cy="28" rx="6" ry="8" fill="#fef3c7" />
      <ellipse cx="42" cy="40" rx="3.5" ry="4.5" fill="#1e293b" />
      <ellipse cx="58" cy="40" rx="3.5" ry="4.5" fill="#1e293b" />
      <path d="M45 45 Q50 50 55 45" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="48" rx="4" ry="3" fill="#1e293b" />
      <g stroke="#c2410c" strokeWidth="1.5" strokeLinecap="round">
        <line x1="32" y1="44" x2="22" y2="42" />
        <line x1="32" y1="49" x2="22" y2="52" />
        <line x1="68" y1="44" x2="78" y2="42" />
        <line x1="68" y1="49" x2="78" y2="52" />
      </g>
      <path d="M50 75 Q40 70 35 75 M50 75 Q60 70 65 75" stroke="#fef3c7" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Avatar08() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="wolf-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#78716c" />
          <stop offset="100%" stopColor="#44403c" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="60" rx="28" ry="24" fill="url(#wolf-gradient)" />
      <ellipse cx="50" cy="38" rx="20" ry="18" fill="url(#wolf-gradient)" />
      <ellipse cx="28" cy="26" rx="9" ry="11" fill="url(#wolf-gradient)" />
      <ellipse cx="72" cy="26" rx="9" ry="11" fill="url(#wolf-gradient)" />
      <ellipse cx="28" cy="24" rx="4" ry="5" fill="#a8a29e" />
      <ellipse cx="72" cy="24" rx="4" ry="5" fill="#a8a29e" />
      <ellipse cx="42" cy="38" rx="3.5" ry="4" fill="#1e293b" />
      <ellipse cx="58" cy="38" rx="3.5" ry="4" fill="#1e293b" />
      <ellipse cx="50" cy="48" rx="5" ry="3.5" fill="#1e293b" />
      <path d="M45 52 Q50 57 55 52" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g stroke="#57534e" strokeWidth="1.5" strokeLinecap="round">
        <line x1="32" y1="44" x2="22" y2="42" />
        <line x1="32" y1="49" x2="22" y2="52" />
        <line x1="68" y1="44" x2="78" y2="42" />
        <line x1="68" y1="49" x2="78" y2="52" />
      </g>
    </svg>
  );
}

function Avatar09() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="lion-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="60" rx="30" ry="24" fill="url(#lion-gradient)" />
      <ellipse cx="50" cy="36" rx="22" ry="18" fill="url(#lion-gradient)" />
      <g fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5">
        <ellipse cx="25" cy="30" rx="12" ry="14" />
        <ellipse cx="75" cy="30" rx="12" ry="14" />
        <ellipse cx="30" cy="25" rx="14" ry="16" />
        <ellipse cx="70" cy="25" rx="14" ry="16" />
        <ellipse cx="35" cy="20" rx="16" ry="18" />
        <ellipse cx="65" cy="20" rx="16" ry="18" />
      </g>
      <ellipse cx="50" cy="38" rx="20" ry="16" fill="url(#lion-gradient)" />
      <circle cx="42" cy="36" r="3.5" fill="#1e293b" />
      <circle cx="58" cy="36" r="3.5" fill="#1e293b" />
      <ellipse cx="50" cy="46" rx="5" ry="4" fill="#1e293b" />
      <path d="M45 51 Q50 56 55 51" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <g stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
        <line x1="25" y1="40" x2="15" y2="38" />
        <line x1="25" y1="46" x2="15" y2="48" />
        <line x1="75" y1="40" x2="85" y2="38" />
        <line x1="75" y1="46" x2="85" y2="48" />
      </g>
    </svg>
  );
}

function Avatar10() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="penguin-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="68" rx="28" ry="24" fill="url(#penguin-gradient)" />
      <ellipse cx="50" cy="38" rx="20" ry="16" fill="url(#penguin-gradient)" />
      <ellipse cx="50" cy="68" rx="16" ry="18" fill="#f8fafc" />
      <ellipse cx="38" cy="38" rx="4" ry="5" fill="#f8fafc" />
      <ellipse cx="62" cy="38" rx="4" ry="5" fill="#f8fafc" />
      <circle cx="42" cy="36" r="2.5" fill="#1e293b" />
      <circle cx="58" cy="36" r="2.5" fill="#1e293b" />
      <ellipse cx="50" cy="44" rx="4" ry="3" fill="#f59e0b" />
      <path d="M46 46 Q50 50 54 46" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="35" cy="72" rx="8" ry="5" fill="#f59e0b" />
      <ellipse cx="65" cy="72" rx="8" ry="5" fill="#f59e0b" />
      <path d="M45 60 Q40 65 35 60 M55 60 Q60 65 65 60" stroke="#f59e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Avatar11() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="redpanda-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="60" rx="26" ry="22" fill="url(#redpanda-gradient)" />
      <ellipse cx="50" cy="36" rx="18" ry="16" fill="url(#redpanda-gradient)" />
      <ellipse cx="28" cy="26" rx="8" ry="10" fill="url(#redpanda-gradient)" />
      <ellipse cx="72" cy="26" rx="8" ry="10" fill="url(#redpanda-gradient)" />
      <ellipse cx="28" cy="24" rx="4" ry="5" fill="#fff7ed" />
      <ellipse cx="72" cy="24" rx="4" ry="5" fill="#fff7ed" />
      <ellipse cx="42" cy="36" rx="3.5" ry="4.5" fill="#1e293b" />
      <ellipse cx="58" cy="36" rx="3.5" ry="4.5" fill="#1e293b" />
      <ellipse cx="50" cy="44" rx="4" ry="3" fill="#1e293b" />
      <path d="M45 46 Q50 50 55 46" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="40" cy="38" rx="7" ry="6" fill="#fed7aa" />
      <ellipse cx="60" cy="38" rx="7" ry="6" fill="#fed7aa" />
      <g stroke="#b45309" strokeWidth="1.5" strokeLinecap="round">
        <line x1="32" y1="44" x2="22" y2="42" />
        <line x1="32" y1="49" x2="22" y2="52" />
        <line x1="68" y1="44" x2="78" y2="42" />
        <line x1="68" y1="49" x2="78" y2="52" />
      </g>
      <path d="M50 78 Q45 72 40 78 M50 78 Q55 72 60 78" stroke="#fb923c" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Avatar12() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      <defs>
        <linearGradient id="elephant-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#78716c" />
          <stop offset="100%" stopColor="#57534e" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="70" rx="30" ry="22" fill="url(#elephant-gradient)" />
      <ellipse cx="50" cy="42" rx="20" ry="16" fill="url(#elephant-gradient)" />
      <path d="M50 50 Q45 58 42 70 Q40 78 48 80" stroke="url(#elephant-gradient)" strokeWidth="10" strokeLinecap="round" fill="none" />
      <ellipse cx="30" cy="34" rx="10" ry="12" fill="url(#elephant-gradient)" />
      <ellipse cx="70" cy="34" rx="10" ry="12" fill="url(#elephant-gradient)" />
      <ellipse cx="30" cy="32" rx="4" ry="5" fill="#fef3c7" />
      <ellipse cx="70" cy="32" rx="4" ry="5" fill="#fef3c7" />
      <circle cx="42" cy="40" r="3" fill="#1e293b" />
      <circle cx="58" cy="40" r="3" fill="#1e293b" />
      <path d="M38 48 Q50 55 62 48" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="40" cy="80" rx="8" ry="6" fill="url(#elephant-gradient)" />
      <ellipse cx="60" cy="80" rx="8" ry="6" fill="url(#elephant-gradient)" />
    </svg>
  );
}

function AvatarFallback() {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">
      <circle cx="50" cy="50" r="30" fill="#94a3b8" />
      <text x="50" y="58" textAnchor="middle" fontSize="24" fill="white" fontFamily="system-ui">?</text>
    </svg>
  );
}