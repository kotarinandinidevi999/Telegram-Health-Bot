import React from 'react';
import { 
  HeartPulse, 
  Eye, 
  Stethoscope, 
  ShieldAlert, 
  Sparkles, 
  TrendingUp, 
  Activity, 
  Droplets, 
  AlertTriangle,
  Award,
  ChevronRight
} from 'lucide-react';

interface FormattedMessageProps {
  text: string;
  isEmergency?: boolean;
}

export default function FormattedMessage({ text, isEmergency }: FormattedMessageProps) {
  if (isEmergency) {
    return (
      <div id="formatted-emergency-card" className="bg-red-50 border-2 border-red-500 rounded-xl p-4 text-red-900 shadow-sm animate-pulse">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-red-500 text-white rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h4 className="font-display font-bold text-lg tracking-tight">⚠️ Medical Emergency Detected</h4>
        </div>
        <p className="font-medium text-red-800 leading-relaxed">
          Seek immediate medical help or contact emergency services in your area. Stop normal responses.
        </p>
        <div className="mt-4 pt-3 border-t border-red-200 text-xs text-red-700 font-sans">
          <strong>Emergency services:</strong> Call 911 (US/Canada), 999 (UK), 112 (Europe), or your local regional hotline immediately. Do not delay!
        </div>
      </div>
    );
  }

  // Pre-process high-priority warning triggers in message text
  if (text.includes("⚠️ Medical Emergency Detected")) {
    return (
      <div id="formatted-emergency-card" className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-600 rounded-lg p-4 text-red-900">
        <div className="flex items-center gap-2 mb-2 font-bold text-red-700">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>⚠️ Medical Emergency Detected</span>
        </div>
        <p className="font-medium text-sm leading-relaxed mb-3">
          Seek immediate medical help or contact emergency services in your area.
        </p>
        <div className="bg-white/60 p-2 rounded text-xs text-amber-800 border border-amber-200">
          ⚠️ This information is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.
        </div>
      </div>
    );
  }

  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let currentGroup: { type: string; title: string; items: string[]; key: string } | null = null;

  const flushGroup = () => {
    if (currentGroup) {
      const { type, title, items, key } = currentGroup;
      
      // Determine iconography and layout colors based on section type
      let borderColor = 'border-blue-200';
      let iconBg = 'bg-blue-50 text-blue-600';
      let Icon = Eye;
      
      if (type === 'symptoms') {
        borderColor = 'border-amber-200';
        iconBg = 'bg-amber-50 text-amber-600';
        Icon = Stethoscope;
      } else if (type === 'causes') {
        borderColor = 'border-purple-200';
        iconBg = 'bg-purple-50 text-purple-600';
        Icon = Activity;
      } else if (type === 'risk') {
        borderColor = 'border-orange-200';
        iconBg = 'bg-orange-50 text-orange-600';
        Icon = TrendingUp;
      } else if (type === 'diagnosis') {
        borderColor = 'border-emerald-200';
        iconBg = 'bg-emerald-50 text-emerald-600';
        Icon = HeartPulse;
      } else if (type === 'treatment') {
        borderColor = 'border-cyan-200';
        iconBg = 'bg-cyan-50 text-cyan-600';
        Icon = Droplets;
      } else if (type === 'prevention') {
        borderColor = 'border-teal-200';
        iconBg = 'bg-teal-50 text-teal-600';
        Icon = Award;
      } else if (type === 'doctor') {
        borderColor = 'border-rose-200';
        iconBg = 'bg-rose-50 text-rose-600';
        Icon = ShieldAlert;
      }

      renderedElements.push(
        <div key={key} className={`my-3 p-3.5 bg-white border ${borderColor} rounded-xl shadow-xs transition-all hover:shadow-sm`}>
          <div className="flex items-center gap-2.5 mb-2">
            <span className={`p-1.5 rounded-lg ${iconBg}`}>
              <Icon className="w-4 h-4" />
            </span>
            <span className="font-display font-semibold text-gray-800 text-sm tracking-tight">{title}</span>
          </div>
          <ul className="space-y-1.5 ml-1">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 leading-relaxed">
                <ChevronRight className="w-3.5 h-3.5 text-blue-400 mt-1 flex-shrink-0" />
                <span>{parseBoldText(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      );
      currentGroup = null;
    }
  };

  const parseBoldText = (str: string) => {
    // Basic helper to convert **bold** markdown to strong components
    const parts = str.split('**');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-semibold text-gray-900">{part}</strong>;
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. Check if title header
    if (line.startsWith('🩺')) {
      flushGroup();
      renderedElements.push(
        <div key={`header-${i}`} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-4 shadow-sm mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <HeartPulse className="w-5 h-5 text-blue-200 animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-blue-100 uppercase font-medium">Educational Medical Assistant</span>
          </div>
          <h3 className="font-display font-semibold text-base leading-snug">{line.replace('🩺', '').trim()}</h3>
        </div>
      );
      continue;
    }

    // 2. Check if special disclaimer section
    if (line.startsWith('⚠️ DISCLAIMER') || line.startsWith('⚠️ This information is for educational purposes')) {
      flushGroup();
      // Gather any successive lines for disclaimer
      let disclaimerText = line;
      while (i + 1 < lines.length && lines[i + 1].trim()) {
        disclaimerText += '\n' + lines[i + 1].trim();
        i++;
      }
      renderedElements.push(
        <div key={`disclaimer-${i}`} className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-amber-800 text-xs mt-4 shadow-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px]">MediGuide Warning & Disclaimer</span>
              <p className="leading-relaxed">{disclaimerText.replace('⚠️ DISCLAIMER', '').replace('⚠️', '').trim()}</p>
            </div>
          </div>
        </div>
      );
      continue;
    }

    // 3. Section Headers (we look for emojis or labels)
    if (line.includes('Overview:')) {
      flushGroup();
      // Overview is usually a paragraph, doesn't need bullet list. We extract text and flush as a paragraph card
      let overviewContent = line.replace('📖 Overview:', '').trim();
      // Read succeeding lines until we Hit another special marker
      while (i + 1 < lines.length && !lines[i + 1].trim().startsWith('•') && !lines[i + 1].trim().startsWith('🩺') && !lines[i + 1].trim().startsWith('⚠️') && !lines[i + 1].trim().includes(':')) {
        overviewContent += '\n' + lines[i + 1].trim();
        i++;
      }
      renderedElements.push(
        <div key={`overview-${i}`} className="my-3 p-3.5 bg-blue-50/30 border border-blue-100 rounded-xl shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Eye className="w-4 h-4" />
            </span>
            <span className="font-display font-semibold text-gray-800 text-sm tracking-tight">📖 System Overview</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed font-sans">{parseBoldText(overviewContent)}</p>
        </div>
      );
      continue;
    }

    if (line.includes('Symptoms:')) {
      flushGroup();
      currentGroup = { type: 'symptoms', title: '🤒 Symptoms & Indicators', items: [], key: `group-${i}` };
      continue;
    }
    if (line.includes('Causes:')) {
      flushGroup();
      currentGroup = { type: 'causes', title: '🦠 Core Causes', items: [], key: `group-${i}` };
      continue;
    }
    if (line.includes('Risk Factors:')) {
      flushGroup();
      currentGroup = { type: 'risk', title: '⚠️ Risk Factors', items: [], key: `group-${i}` };
      continue;
    }
    if (line.includes('Diagnosis:')) {
      flushGroup();
      currentGroup = { type: 'diagnosis', title: '🔬 Clinical Diagnosis Tests', items: [], key: `group-${i}` };
      continue;
    }
    if (line.includes('Treatment:')) {
      flushGroup();
      currentGroup = { type: 'treatment', title: '💊 Therapeutic Options (No Dosage)', items: [], key: `group-${i}` };
      continue;
    }
    if (line.includes('Prevention:')) {
      flushGroup();
      currentGroup = { type: 'prevention', title: '🛡️ Prevention & Safety Guidelines', items: [], key: `group-${i}` };
      continue;
    }
    if (line.includes('When to See a Doctor:')) {
      flushGroup();
      let doctorContent = line.replace('👨‍⚕️ When to See a Doctor:', '').replace('👨⚕️ When to See a Doctor:', '').trim();
      while (i + 1 < lines.length && !lines[i + 1].trim().startsWith('•') && !lines[i + 1].trim().startsWith('🩺') && !lines[i + 1].trim().startsWith('⚠️') && !lines[i + 1].trim().includes(':')) {
        doctorContent += '\n' + lines[i + 1].trim();
        i++;
      }
      renderedElements.push(
        <div key={`doctor-${i}`} className="my-3 p-3.5 bg-rose-50/40 border border-rose-100 rounded-xl shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <span className="font-display font-semibold text-rose-900 text-sm tracking-tight">👨‍⚕️ When to Consult a Professional</span>
          </div>
          <p className="text-sm text-rose-800 leading-relaxed font-sans">{parseBoldText(doctorContent)}</p>
        </div>
      );
      continue;
    }

    // 4. Bullet lines
    if (line.startsWith('•') || line.startsWith('-')) {
      const cleanLine = line.replace(/^•\s*/, '').replace(/^-\s*/, '').trim();
      if (currentGroup) {
        currentGroup.items.push(cleanLine);
      } else {
        // orphaned bullet
        renderedElements.push(
          <div key={`orphan-${i}`} className="flex items-start gap-2 text-sm text-gray-600 leading-relaxed ml-2 my-1">
            <ChevronRight className="w-3.5 h-3.5 text-blue-400 mt-1 flex-shrink-0" />
            <span>{parseBoldText(cleanLine)}</span>
          </div>
        );
      }
      continue;
    }

    // 5. Normal text line fallback
    flushGroup();
    renderedElements.push(
      <p key={`text-${i}`} className="text-sm text-gray-700 leading-relaxed my-2 font-sans">
        {parseBoldText(line)}
      </p>
    );
  }

  flushGroup();

  return (
    <div className="space-y-1">
      {renderedElements}
    </div>
  );
}
