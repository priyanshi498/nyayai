'use client';

import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Scale, 
  Plus, 
  FileText, 
  CheckSquare, 
  Settings, 
  Download, 
  Trash2, 
  AlertTriangle, 
  Info, 
  Mic, 
  Send,
  Loader,
  X,
  CheckCircle,
  Copy,
  Moon,
  Sun,
  Shield,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

interface Classification {
  domain: string;
  severity: string;
  keyEntities: string[];
  summary: string;
}

interface AnalysisResult {
  id: string;
  title: string;
  problem: string;
  language: string;
  classification: Classification;
  rights: string;
  actionPlan: string;
  document: string;
  timestamp: string;
  customizerData?: {
    senderName?: string;
    senderAddress?: string;
    oppositeName?: string;
    oppositeAddress?: string;
    customAmount?: string;
    customProperty?: string;
  };
}

const MOCK_LANDLORD_RESPONSE = {
  classification: {
    domain: 'Tenant',
    severity: 'Medium',
    keyEntities: ['Landlord', 'Security Deposit', '3 Months'],
    summary: 'Landlord has withheld the security deposit for 3 months after the tenancy ended.'
  },
  rights: `## Tenant Rights in India: Security Deposit Refund

Under the **Model Tenancy Act, 2021 (MTA)** and state-specific Rent Control Acts, you have clear protections regarding your security deposit:

1. **Cap on Security Deposit (Section 11 of MTA)**:
   - For residential premises, the security deposit is capped at a maximum of **2 months\' rent**.

2. **Timely Refund of Security Deposit**:
   - The landlord is legally obligated to refund the security deposit **at the time of taking over vacant possession** of the premises.
   - The landlord cannot withhold the deposit indefinitely. Three months is an unreasonable delay.

3. **Justified Deductions Only**:
   - The landlord can only make deductions for unpaid rent or outstanding utility bills.
   - The landlord **cannot** deduct charges for painting or standard "wear and tear" unless explicitly written in the agreement.

4. **Right against Exploitation**:
   - If the landlord refuses to return the deposit, the tenant has the right to approach the **Rent Authority** to resolve the dispute.`,
  actionPlan: `## Step-by-Step Action Plan

1. **Step 1: Gather Evidentiary Documents** (Immediate)
   - Locate your registered Rent Agreement.
   - Keep copies of rent receipts and bank statements showing rent payments.
   - Take screenshots of WhatsApp chats or emails where you requested the return of the deposit.

2. **Step 2: Send a Formal Legal Notice** (Within 7 days)
   - Send the drafted Legal Notice via Registered Post or Speed Post.
   - Give the landlord **15 days** from the date of receipt to refund the amount.
   - Keep the postal receipt and tracking status sheet as proof of delivery.

3. **Step 3: Approach the Rent Authority / Court** (If no response in 15 days)
   - File an application before the local **Rent Authority** (setup under the Model Tenancy Act).
   - The Rent Authority will conduct hearings and direct the landlord to refund the amount.
   - *Estimated Cost:* Nominal filing fee (typically ₹500 to ₹1000).
   - *Estimated Timeline:* 30 to 90 days.`,
  document: `LEGAL NOTICE
(Registered A.D. / Speed Post)

Date: [Date]

To,
[Opposite Party Name]
[Opposite Party Address]

SUBJECT: LEGAL NOTICE FOR REFUND OF SECURITY DEPOSIT AMOUNTING TO RS. [Amount] IN RESPECT OF TENANCY AT [Property Address]

Dear Sir/Madam,

Under instructions from and on behalf of my client [Your Name], resident of [Your Address], I hereby serve you with the following legal notice:

1. That my client was a tenant in respect of your residential premises situated at [Property Address] under a tenancy agreement dated [Agreement Date], on a monthly rent of Rs. [Monthly Rent].

2. That at the inception of the tenancy, my client paid an amount of Rs. [Amount] to you as a refundable security deposit, which was to be returned without interest upon vacating the premises.

3. That my client vacated the premises on [Vacation Date] and handed over peaceful, vacant possession to you. All rent, electricity, and utility dues were fully paid up to the date of vacating, and there were no damages caused to the property.

4. That despite handing over possession, you have failed and neglected to refund the security deposit of Rs. [Amount] to my client, which has now been withheld by you for a period of 3 months without any lawful justification.

I hereby call upon you to refund the sum of Rs. [Amount] along with interest @ 12% p.a. to my client within 15 days of the receipt of this notice, failing which my client shall be constrained to initiate legal proceedings against you in the Rent Court / appropriate forum, in which case you shall be liable for all costs and consequences.

Sincerely,

[Your Name]
(Sender)`
};

// Custom Markdown Viewer component
function MarkdownViewer({ text }: { text: string }) {
  if (!text) return null;
  
  const lines = text.split('\n');
  const rendered: React.ReactNode[] = [];
  
  let inList = false;
  let listItems: React.ReactNode[] = [];
  let inOrderedList = false;
  let orderedListItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList && listItems.length > 0) {
      rendered.push(
        <ul key={`ul-${rendered.length}`} style={{ listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '1.25rem' }}>
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
    if (inOrderedList && orderedListItems.length > 0) {
      rendered.push(
        <ol key={`ol-${rendered.length}`} style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', marginBottom: '1.25rem' }}>
          {orderedListItems}
        </ol>
      );
      orderedListItems = [];
      inOrderedList = false;
    }
  };

  const parseInline = (lineText: string) => {
    const parts = [];
    let remaining = lineText;
    let keyIdx = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
      const codeMatch = remaining.match(/`(.*?)`/);

      let firstMatch = null;
      let matchType: 'bold' | 'code' | null = null;

      if (boldMatch && codeMatch) {
        if (boldMatch.index! < codeMatch.index!) {
          firstMatch = boldMatch;
          matchType = 'bold';
        } else {
          firstMatch = codeMatch;
          matchType = 'code';
        }
      } else if (boldMatch) {
        firstMatch = boldMatch;
        matchType = 'bold';
      } else if (codeMatch) {
        firstMatch = codeMatch;
        matchType = 'code';
      }

      if (firstMatch && firstMatch.index !== undefined) {
        if (firstMatch.index > 0) {
          parts.push(remaining.substring(0, firstMatch.index));
        }
        const matchedText = firstMatch[1];
        if (matchType === 'bold') {
          parts.push(<strong key={`bold-${keyIdx++}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{matchedText}</strong>);
        } else {
          parts.push(
            <code key={`code-${keyIdx++}`} style={{
              fontFamily: 'monospace',
              background: 'var(--bg-tertiary)',
              padding: '0.15rem 0.35rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-primary)',
              fontSize: '0.9em'
            }}>{matchedText}</code>
          );
        }
        remaining = remaining.substring(firstMatch.index + firstMatch[0].length);
      } else {
        parts.push(remaining);
        break;
      }
    }

    return parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      flushList();
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      rendered.push(<h4 key={i} style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>{parseInline(line.substring(4))}</h4>);
    } else if (line.startsWith('## ')) {
      flushList();
      rendered.push(
        <h3 key={i} style={{ 
          fontSize: '1.4rem', 
          color: 'var(--text-primary)', 
          marginTop: '1.5rem', 
          marginBottom: '0.75rem', 
          borderBottom: '1px solid var(--border-color)', 
          paddingBottom: '0.35rem',
          fontWeight: 600
        }}>{parseInline(line.substring(3))}</h3>
      );
    } else if (line.startsWith('# ')) {
      flushList();
      rendered.push(<h2 key={i} style={{ fontSize: '1.75rem', color: 'var(--text-primary)', marginTop: '1.75rem', marginBottom: '1rem', fontWeight: 700 }}>{parseInline(line.substring(2))}</h2>);
    }
    // Unordered Lists
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inOrderedList) flushList();
      inList = true;
      listItems.push(
        <li key={i} style={{ marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
          {parseInline(line.substring(2))}
        </li>
      );
    }
    // Ordered Lists
    else if (/^\d+\.\s/.test(line)) {
      if (inList) flushList();
      inOrderedList = true;
      const match = line.match(/^(\d+)\.\s(.*)/);
      if (match) {
        orderedListItems.push(
          <li key={i} style={{ marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
            {parseInline(match[2])}
          </li>
        );
      }
    }
    // Blockquotes
    else if (line.startsWith('> ')) {
      flushList();
      rendered.push(
        <blockquote key={i} style={{
          borderLeft: '4px solid var(--accent-primary)',
          paddingLeft: '1rem',
          margin: '1rem 0',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          background: 'var(--bg-tertiary)',
          padding: '0.75rem 1rem',
          borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
        }}>
          {parseInline(line.substring(2))}
        </blockquote>
      );
    }
    // Regular Paragraphs
    else {
      flushList();
      rendered.push(<p key={i} style={{ marginBottom: '1rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>{parseInline(line)}</p>);
    }
  }

  flushList();

  return <div className="legal-prose">{rendered}</div>;
}

export default function Home() {
  const [problem, setProblem] = useState('');
  const [language, setLanguage] = useState('en');
  const [userApiKey, setUserApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'rights' | 'action' | 'document'>('overview');
  
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  
  // Notice Customizer Fields
  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [oppositeName, setOppositeName] = useState('');
  const [oppositeAddress, setOppositeAddress] = useState('');
  const [customAmount, setCustomAmount] = useState('20,000');
  const [customProperty, setCustomProperty] = useState('Flat 302, Green Apartments, Delhi');
  const [documentContent, setDocumentContent] = useState('');
  
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Voice Input States
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Agent thoughts log during loading
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load configuration and history on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('nyayai_gemini_key') || '';
    setUserApiKey(savedKey);
    
    const savedHistory = localStorage.getItem('nyayai_cases');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
        if (parsed.length > 0) {
          loadCase(parsed[0]);
        }
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }

    // Initialize Native Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        
        rec.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          setProblem(prev => prev ? prev + ' ' + transcript : transcript);
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        rec.onerror = (err: any) => {
          console.error('Speech recognition error', err);
          setIsRecording(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  // Update speech recognition language when state changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : language === 'hinglish' ? 'hi-IN' : 'en-IN';
    }
  }, [language]);

  // Scroll loader logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentLogs]);

  // Update document content when customization fields change
  useEffect(() => {
    if (activeCaseId) {
      const activeCase = history.find(c => c.id === activeCaseId);
      if (activeCase) {
        let text = activeCase.document;
        // Replace placeholders dynamically
        if (senderName) text = text.replaceAll('[Your Name]', senderName);
        if (senderAddress) text = text.replaceAll('[Your Address]', senderAddress);
        if (oppositeName) text = text.replaceAll('[Opposite Party Name]', oppositeName);
        if (oppositeAddress) text = text.replaceAll('[Opposite Party Address]', oppositeAddress);
        if (customAmount) text = text.replaceAll('[Amount]', customAmount);
        if (customProperty) text = text.replaceAll('[Property Address]', customProperty);
        
        // General fallback replacements for notice
        const today = new Date().toLocaleDateString('en-IN');
        text = text.replaceAll('[Date]', today);
        text = text.replaceAll('[Agreement Date]', '15th May 2025');
        text = text.replaceAll('[Monthly Rent]', '10,000');
        text = text.replaceAll('[Vacation Date]', '1st March 2026');
        
        setDocumentContent(text);
      }
    }
  }, [senderName, senderAddress, oppositeName, oppositeAddress, customAmount, customProperty, activeCaseId]);

  // Sync customizer inputs back into the history case object to persist edits
  useEffect(() => {
    if (activeCaseId) {
      setHistory(prev => {
        const idx = prev.findIndex(c => c.id === activeCaseId);
        if (idx !== -1) {
          const item = prev[idx];
          const hasChanged = 
            item.customizerData?.senderName !== senderName ||
            item.customizerData?.senderAddress !== senderAddress ||
            item.customizerData?.oppositeName !== oppositeName ||
            item.customizerData?.oppositeAddress !== oppositeAddress ||
            item.customizerData?.customAmount !== customAmount ||
            item.customizerData?.customProperty !== customProperty;

          if (hasChanged) {
            const updated = [...prev];
            updated[idx] = {
              ...item,
              customizerData: {
                senderName,
                senderAddress,
                oppositeName,
                oppositeAddress,
                customAmount,
                customProperty
              }
            };
            localStorage.setItem('nyayai_cases', JSON.stringify(updated));
            return updated;
          }
        }
        return prev;
      });
    }
  }, [senderName, senderAddress, oppositeName, oppositeAddress, customAmount, customProperty, activeCaseId]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const saveApiKey = (key: string) => {
    localStorage.setItem('nyayai_gemini_key', key);
    setUserApiKey(key);
    setShowSettings(false);
  };

  const handleVoiceInputMock = () => {
    setProblem('Landlord ne deposit wapas nahi kiya 3 mahine ho gaye, agreement kehta tha refund hoga immediately');
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Native voice recognition is not supported in this browser. Please try Chrome or Edge, or use the "Simulate" option.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        setIsRecording(true);
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition', err);
        setIsRecording(false);
      }
    }
  };

  const loadCase = (caseObj: AnalysisResult) => {
    setActiveCaseId(caseObj.id);
    setProblem(caseObj.problem);
    setLanguage(caseObj.language);
    setDocumentContent(caseObj.document);
    
    // Load customizer details if previously saved
    const cData = caseObj.customizerData || {};
    setSenderName(cData.senderName || '');
    setSenderAddress(cData.senderAddress || '');
    setOppositeName(cData.oppositeName || '');
    setOppositeAddress(cData.oppositeAddress || '');
    setCustomAmount(cData.customAmount || '20,000');
    setCustomProperty(cData.customProperty || 'Flat 302, Green Apartments, Delhi');
    
    setActiveTab('overview');
  };

  const deleteCase = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(c => c.id !== id);
    setHistory(updated);
    localStorage.setItem('nyayai_cases', JSON.stringify(updated));
    if (activeCaseId === id) {
      if (updated.length > 0) {
        loadCase(updated[0]);
      } else {
        setActiveCaseId(null);
        setProblem('');
        setDocumentContent('');
      }
    }
  };

  const handleDemoClick = () => {
    setProblem('Landlord ne deposit wapas nahi kiya 3 mahine ho gaye');
    runAnalysis(true);
  };

  const runAnalysis = async (forceDemo = false) => {
    const apiToUse = userApiKey.trim();
    // Do not block; let the backend attempt to use its configured key if the user has not pasted one locally.

    setIsLoading(true);
    setCurrentStep(1);
    setActiveTab('overview');
    setAgentLogs(['[System] Initializing Multi-Agent Consult Desk...', '[System] Loading legal ontology mappings...']);

    const stepsTimer = (step: number, delay: number, nextLogs: string[]) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setCurrentStep(step);
          setAgentLogs(prev => [...prev, ...nextLogs]);
          resolve();
        }, delay);
      });
    };

    try {
      if (forceDemo) {
        await stepsTimer(1, 1000, [
          '[Classifier] Starting classification check...',
          '[Classifier] Scanning user input tokens for legal triggers...',
          '[Classifier] Match found: "deposit", "landlord", "3 mahine".',
          '[Classifier] Case domain categorized as: Tenant Disputes.',
          '[Classifier] Severity assigned: Medium. Handing off to RAG Retriever...'
        ]);
        
        await stepsTimer(2, 1000, [
          '[RAG] Analyzing semantic keywords...',
          '[RAG] Fallback Keyword indexing loaded.',
          '[RAG] Retrieving statutory articles matching "Tenant" and "Deposit"...',
          '[RAG] Retrieved 1 source: Section 11 of Model Tenancy Act, 2021.',
          '[RAG] Grounded context compiled. Handing off to Rights Explainer...'
        ]);
        
        await stepsTimer(3, 1000, [
          '[Explainer] Translating statutory structures...',
          '[Explainer] Constructing explanation layout in English...',
          '[Explainer] Formulated rights under Indian tenancy codes.',
          '[Explainer] Rights explanation generated. Handing off to Action Planner...'
        ]);
        
        await stepsTimer(4, 1000, [
          '[Planner] Loading litigation rules & authority listings...',
          '[Planner] Extracting relevant legal helplines & timelines...',
          '[Planner] Compiled step-by-step litigation procedure.',
          '[Planner] Action guidelines completed. Handing off to Document Drafter...'
        ]);
        
        await stepsTimer(5, 1000, [
          '[Drafter] Drafting formal legal documents...',
          '[Drafter] Formatting notice body under Section 11, MTA.',
          '[Drafter] Document successfully formatted with customizable fields.',
          '[System] Legal Consultation successfully built!'
        ]);
        
        const newCase: AnalysisResult = {
          id: Date.now().toString(),
          title: 'Landlord Deposit Refund Case',
          problem: problem || 'Landlord ne deposit wapas nahi kiya 3 mahine ho gaye',
          language,
          classification: MOCK_LANDLORD_RESPONSE.classification,
          rights: MOCK_LANDLORD_RESPONSE.rights,
          actionPlan: MOCK_LANDLORD_RESPONSE.actionPlan,
          document: MOCK_LANDLORD_RESPONSE.document,
          timestamp: new Date().toLocaleString(),
          customizerData: {
            senderName: '',
            senderAddress: '',
            oppositeName: '',
            oppositeAddress: '',
            customAmount: '20,000',
            customProperty: 'Flat 302, Green Apartments, Delhi'
          }
        };

        const updatedHistory = [newCase, ...history];
        setHistory(updatedHistory);
        localStorage.setItem('nyayai_cases', JSON.stringify(updatedHistory));
        loadCase(newCase);
      } else {
        // Run actual API call with simulated concurrent logs to keep user engaged
        const logTimer = setInterval(() => {
          const simulatorThoughts = [
            '[Classifier] Checking text linguistic properties...',
            '[RAG] Navigating vector file nodes...',
            '[Explainer] Formulating constitutional framework parameters...',
            '[Planner] Evaluating dispute resolution timelines...',
            '[Drafter] Formatting letter syntax blocks...'
          ];
          const randomThought = simulatorThoughts[Math.floor(Math.random() * simulatorThoughts.length)];
          setAgentLogs(prev => [...prev, randomThought]);
        }, 1200);

        setAgentLogs(prev => [...prev, '[Classifier] Querying Google Gemini Classifier agent...']);
        
        const personalDetails = {
          senderName,
          senderAddress,
          oppositeName,
          oppositeAddress,
          dateDetails: '',
          demand: customAmount
        };

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            problem,
            language,
            userApiKey: apiToUse,
            personalDetails
          })
        });

        clearInterval(logTimer);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to analyze case');
        }

        setAgentLogs(prev => [
          ...prev, 
          `[Classifier] Domain resolved: ${data.classification.domain}`,
          '[RAG] Match found in local vector documents.',
          '[Explainer] Custom rights draft synthesized successfully.',
          '[Planner] Checklist timeline generated.',
          '[Drafter] Notice document fully constructed.',
          '[System] Analysis finished.'
        ]);

        const newCase: AnalysisResult = {
          id: Date.now().toString(),
          title: `${data.classification.domain} Case - ${new Date().toLocaleDateString()}`,
          problem,
          language,
          classification: data.classification,
          rights: data.rights,
          actionPlan: data.actionPlan,
          document: data.document,
          timestamp: new Date().toLocaleString(),
          customizerData: {
            senderName,
            senderAddress,
            oppositeName,
            oppositeAddress,
            customAmount,
            customProperty
          }
        };

        const updatedHistory = [newCase, ...history];
        setHistory(updatedHistory);
        localStorage.setItem('nyayai_cases', JSON.stringify(updatedHistory));
        loadCase(newCase);
      }
    } catch (error: any) {
      alert(`Analysis failed: ${error.message}`);
      if (error.message.toLowerCase().includes('api key') || error.message.toLowerCase().includes('key is missing')) {
        setShowSettings(true);
      }
    } finally {
      setIsLoading(false);
      setCurrentStep(0);
    }
  };

  const handleCopyNotice = () => {
    if (!documentContent) return;
    navigator.clipboard.writeText(documentContent);
    alert('Notice content copied to clipboard!');
  };

  const handleDownloadPDF = () => {
    if (!documentContent) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20; // 20mm margins
      const maxLineWidth = pageWidth - (margin * 2);

      // Split text to fit page width
      const splitText = doc.splitTextToSize(documentContent, maxLineWidth);
      
      // Document header
      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.text('FORMAL LEGAL NOTICE', pageWidth / 2, margin, { align: 'center' });
      
      // Header divider line
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 4, pageWidth - margin, margin + 4);
      
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      
      let y = margin + 14;
      const lineHeight = 6.5;

      for (let i = 0; i < splitText.length; i++) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        
        const line = splitText[i];
        
        // Dynamic formatting rules for PDF styling
        if (
          line.startsWith('SUBJECT:') || 
          line.startsWith('Dear Sir') || 
          line.startsWith('To,') ||
          line.startsWith('Sincerely,')
        ) {
          doc.setFont('times', 'bold');
        } else {
          doc.setFont('times', 'normal');
        }

        doc.text(line, margin, y);
        y += lineHeight;
      }

      doc.save(`nyayai_legal_notice_${activeCaseId || 'draft'}.pdf`);
    } catch (e) {
      console.error('PDF Generation failed', e);
      alert('Failed to generate PDF. You can copy the text manually from the editor.');
    }
  };

  const activeCase = history.find(c => c.id === activeCaseId);

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* 1. SIDEBAR (Left) */}
      <div className="sidebar glass" style={{ width: '290px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', zIndex: 10 }}>
        
        {/* Brand Header */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--accent-primary)', padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700, fontFamily: 'var(--font-display)' }}>NyayAI</h1>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: 500 }}>Legal Intelligence Agent</span>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ padding: '1rem' }}>
          <button 
            onClick={() => {
              setActiveCaseId(null);
              setProblem('');
              setDocumentContent('');
            }}
            className="btn-new btn-hover"
            style={{
              width: '100%',
              padding: '0.7rem 1rem',
              background: 'var(--accent-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px var(--accent-glow)',
              fontFamily: 'var(--font-display)',
              fontSize: '0.85rem'
            }}
          >
            <Plus size={16} /> New Consultation
          </button>
        </div>

        {/* History List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0.75rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem', paddingLeft: '0.5rem', letterSpacing: '0.05em' }}>History</span>
          
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No cases analyzed yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {history.map(item => {
                const domainColor = 
                  item.classification.domain.toLowerCase() === 'tenant' ? '#6366f1' :
                  item.classification.domain.toLowerCase() === 'consumer' ? '#10b981' :
                  item.classification.domain.toLowerCase() === 'labor' ? '#f59e0b' :
                  '#ef4444';

                return (
                  <div 
                    key={item.id} 
                    onClick={() => loadCase(item)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: activeCaseId === item.id ? 'var(--bg-tertiary)' : 'transparent',
                      border: '1px solid',
                      borderColor: activeCaseId === item.id ? 'var(--border-focus)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    className="history-item"
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                        <span style={{
                          display: 'inline-block',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: domainColor
                        }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.classification.domain} Case
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.problem}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => deleteCase(item.id, e)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                      className="btn-delete btn-hover"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Footer Controls */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={toggleTheme}
            className="btn-hover"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 500 }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} Theme: {theme.toUpperCase()}
          </button>
          
          <button 
            onClick={() => setShowSettings(true)}
            className="btn-hover"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
            title="Configure API Key"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
        
        {/* Main Header */}
        <div className="glass" style={{ padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Indian Legal System AI</span>
            <h2 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              {activeCase ? `${activeCase.classification.domain} Redressal Desk` : 'AI Legal Consult'}
            </h2>
          </div>
          
          {/* Quick Language Toggle */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '6px' }}>
            {['en', 'hi', 'hinglish'].map(lang => (
              <button 
                key={lang}
                onClick={() => setLanguage(lang)}
                style={{
                  padding: '0.25rem 0.6rem',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: language === lang ? 'var(--accent-primary)' : 'transparent',
                  color: language === lang ? '#fff' : 'var(--text-secondary)'
                }}
              >
                {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'Hinglish'}
              </button>
            ))}
          </div>
        </div>

        {/* Main Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* Case Consult Interface / Result Split */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.5rem 2rem' }}>
            
            {!activeCase && !isLoading ? (
              // Empty State Input Form
              <div className="animate-slide" style={{ maxWidth: '680px', margin: '1.5rem auto', width: '100%' }}>
                
                {/* SVG Legal Crest Logo */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-glow)' }}>
                    <Shield size={36} color="var(--accent-primary)" style={{ opacity: 0.9 }} />
                    <Scale size={20} color="var(--accent-primary)" style={{ position: 'absolute' }} />
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.65rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 700 }}>Describe your legal issue</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '520px', margin: '0 auto' }}>
                    State your legal grievance in simple language (Hindi, English, or Hinglish). NyayAI will match relevant statutes and compile a notice.
                  </p>
                </div>

                <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Speech input status indicators */}
                  {isRecording && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '6px' }}>
                      <div className="waveform">
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', fontWeight: 700 }}>Listening... Speak into your microphone. Click "Mic" again to stop.</span>
                    </div>
                  )}

                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder="Example: Landlord is refusing to return my security deposit of Rs. 20,000 for the last 3 months, even though I vacated the flat and cleared all electricity bills..."
                    style={{
                      width: '100%',
                      minHeight: '140px',
                      resize: 'vertical',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.925rem',
                      lineHeight: '1.6',
                      padding: 0
                    }}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {/* Real Voice Input Button */}
                      <button 
                        onClick={toggleRecording}
                        className={`btn-hover ${isRecording ? 'glow-active' : ''}`}
                        style={{
                          background: isRecording ? 'var(--accent-danger)' : 'var(--bg-tertiary)',
                          border: 'none',
                          color: isRecording ? '#fff' : 'var(--text-secondary)',
                          padding: '0.5rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}
                      >
                        <Mic size={14} color={isRecording ? '#fff' : 'var(--accent-danger)'} /> 
                        {isRecording ? 'Stop Recording' : 'Voice Input'}
                      </button>

                      {/* Mock Voice Input fallback */}
                      <button 
                        onClick={handleVoiceInputMock}
                        className="btn-hover"
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-muted)',
                          padding: '0.5rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Simulate Voice
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={handleDemoClick}
                        className="btn-hover"
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          padding: '0.5rem 1rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.8rem'
                        }}
                      >
                        Demo Case
                      </button>
                      <button 
                        onClick={() => runAnalysis(false)}
                        disabled={!problem.trim()}
                        className="btn-hover"
                        style={{
                          background: 'var(--accent-primary)',
                          color: '#fff',
                          border: 'none',
                          padding: '0.5rem 1.25rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          opacity: problem.trim() ? 1 : 0.6
                        }}
                      >
                        Analyze Case <Send size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Common Scenarios Supported */}
                <div style={{ marginTop: '2.5rem' }}>
                  <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                    <Info size={12} /> Common Legal Scenarios
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div 
                      className="glass history-item" 
                      style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} 
                      onClick={() => setProblem('I was fired from my office without any notice, and they have withheld my last month salary and FnF clearances.')}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700, display: 'block' }}>Labor Dispute</span>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.4' }}>Salary withholding & termination without notice.</p>
                    </div>
                    <div 
                      className="glass history-item" 
                      style={{ padding: '0.85rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} 
                      onClick={() => setProblem('Maine Amazon se ek smart TV order kiya tha Rs. 35,000 ka, screen damaged aayi and policy hone ke baat bhi product return ya refund reject kar diya.')}
                    >
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 700, display: 'block' }}>Consumer Grievance</span>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: '1.4' }}>Damaged goods refund rejection by vendor.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              // Loading sequence & Agent visualization
              <div style={{ maxWidth: '600px', margin: '2.5rem auto', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <Loader className="spinner" size={40} style={{ color: 'var(--accent-primary)', marginBottom: '1.25rem' }} />
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', fontWeight: 700 }}>AI Agents Analyzing Grievance...</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Mapping constitutional clauses and grounding statutes.
                  </p>
                </div>

                {/* Agent Chain Pipeline Display */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  {[
                    { id: 1, name: 'Classifier Agent', desc: 'Detecting domain, key entities, and severity' },
                    { id: 2, name: 'RAG Retriever', desc: 'Querying local statutory database files' },
                    { id: 3, name: 'Rights Explainer Agent', desc: 'Formulating legal descriptions under Indian Code' },
                    { id: 4, name: 'Action Planner Agent', desc: 'Drafting resolution steps, costs, and timelines' },
                    { id: 5, name: 'Document Drafter Agent', desc: 'Structuring official legal notice/complaint document' }
                  ].map(step => {
                    const isActive = currentStep === step.id;
                    const isDone = currentStep > step.id;
                    
                    return (
                      <div 
                        key={step.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          background: isActive ? 'var(--accent-glow)' : 'transparent',
                          opacity: isDone || isActive ? 1 : 0.45
                        }}
                      >
                        <div>
                          {isDone ? (
                            <CheckCircle size={18} color="var(--accent-success)" />
                          ) : isActive ? (
                            <Loader size={18} className="spinner" color="var(--accent-primary)" />
                          ) : (
                            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
                              {step.id}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                            {step.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {step.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Console Log Feed */}
                <div style={{ marginTop: '1.25rem', background: '#030712', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: '1rem', fontFamily: 'monospace', fontSize: '0.72rem', color: '#10b981', height: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {agentLogs.map((log, index) => (
                    <div key={index} style={{ whiteSpace: 'pre-wrap' }}>
                      {log}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            ) : (
              // Results Display (Interactive Tabs)
              <div className="animate-slide" style={{ width: '100%' }}>
                
                {/* Result Tabs Navigation */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem', gap: '1.5rem' }}>
                  {[
                    { id: 'overview', label: 'Case Overview', icon: Scale },
                    { id: 'rights', label: 'Rights Explained', icon: Info },
                    { id: 'action', label: 'Action Checklist', icon: CheckSquare },
                    { id: 'document', label: 'Drafted Document', icon: FileText }
                  ].map(tab => {
                    const IconComp = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          paddingBottom: '0.65rem',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '2px solid',
                          borderColor: isActive ? 'var(--accent-primary)' : 'transparent',
                          color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        <IconComp size={14} /> {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Contents */}
                {activeTab === 'overview' && activeCase && (
                  <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                      <div className="glass" style={{ flex: 1, padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.02em' }}>Detected Domain</span>
                        <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', marginTop: '0.2rem', fontWeight: 700 }}>{activeCase.classification.domain}</h3>
                      </div>
                      
                      <div className="glass" style={{ flex: 1, padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.02em' }}>Severity Level</span>
                        <div>
                          <span 
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              display: 'inline-block',
                              marginTop: '0.35rem',
                              padding: '0.2rem 0.65rem',
                              borderRadius: '20px',
                              background: 
                                activeCase.classification.severity.toLowerCase() === 'high' ? 'rgba(244, 63, 94, 0.12)' :
                                activeCase.classification.severity.toLowerCase() === 'medium' ? 'rgba(245, 158, 11, 0.12)' :
                                'rgba(16, 185, 129, 0.12)',
                              color: 
                                activeCase.classification.severity.toLowerCase() === 'high' ? 'var(--accent-danger)' :
                                activeCase.classification.severity.toLowerCase() === 'medium' ? 'var(--accent-warning)' :
                                'var(--accent-success)'
                            }}
                          >
                            {activeCase.classification.severity}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>Key Entities Extracted</h4>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {activeCase.classification.keyEntities.map((ent, idx) => (
                          <span key={idx} style={{ background: 'var(--bg-tertiary)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: 500 }}>
                            {ent}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="glass" style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ marginBottom: '0.4rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 700 }}>Case Summary</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.6' }}>{activeCase.classification.summary}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.65rem', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)', alignItems: 'flex-start' }}>
                      <AlertTriangle color="var(--accent-warning)" size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Disclaimer:</strong> NyayAI is an AI-powered educational legal aid tool. It provides legal notice drafts and explains basic acts/procedures under Indian Law, but it **does not substitute a professional lawyer or legal advice**. Consult a qualified attorney for formal legal action.
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'rights' && activeCase && (
                  <div className="animate-slide glass" style={{ padding: '1.5rem 2rem', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                    <MarkdownViewer text={activeCase.rights} />
                  </div>
                )}

                {activeTab === 'action' && activeCase && (
                  <div className="animate-slide glass" style={{ padding: '1.5rem 2rem', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                    <MarkdownViewer text={activeCase.actionPlan} />
                  </div>
                )}

                {activeTab === 'document' && activeCase && (
                  <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Customize properties inside the document using the left customizer toolbar.
                      </p>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={handleCopyNotice}
                          className="btn-hover"
                          style={{
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            padding: '0.45rem 0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.8rem'
                          }}
                        >
                          <Copy size={13} /> Copy Text
                        </button>
                        <button 
                          onClick={handleDownloadPDF}
                          className="btn-hover"
                          style={{
                            background: 'var(--accent-success)',
                            color: '#fff',
                            border: 'none',
                            padding: '0.45rem 1rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontSize: '0.8rem'
                          }}
                        >
                          <Download size={13} /> Download PDF
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                      
                      {/* Notice Customizer Form */}
                      <div className="glass" style={{ width: '310px', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.85rem', height: 'fit-content' }}>
                        <h4 style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Settings size={14} color="var(--accent-primary)" /> Customizer Tool
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Your Name</label>
                          <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="E.g., Rahul Kumar" style={{ padding: '0.45rem 0.65rem' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Your Address</label>
                          <input type="text" value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} placeholder="Your full address" style={{ padding: '0.45rem 0.65rem' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Opposite Party Name</label>
                          <input type="text" value={oppositeName} onChange={(e) => setOppositeName(e.target.value)} placeholder="E.g., Ramesh (Landlord)" style={{ padding: '0.45rem 0.65rem' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Opposite Party Address</label>
                          <input type="text" value={oppositeAddress} onChange={(e) => setOppositeAddress(e.target.value)} placeholder="Opposite party address" style={{ padding: '0.45rem 0.65rem' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Claim Amount (Rs.)</label>
                          <input type="text" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="E.g., 20,000" style={{ padding: '0.45rem 0.65rem' }} />
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Property/Transaction Location</label>
                          <input type="text" value={customProperty} onChange={(e) => setCustomProperty(e.target.value)} placeholder="E.g., Flat 302, Green Apts" style={{ padding: '0.45rem 0.65rem' }} />
                        </div>
                      </div>

                      {/* Notice Document Text Editor */}
                      <div className="glass" style={{ flex: 1, padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                        <textarea
                          value={documentContent}
                          onChange={(e) => setDocumentContent(e.target.value)}
                          style={{
                            width: '100%',
                            minHeight: '460px',
                            background: '#ffffff',
                            color: '#1e293b',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            padding: '1.25rem',
                            fontFamily: 'Courier, monospace',
                            fontSize: '0.85rem',
                            lineHeight: '1.6',
                            resize: 'vertical'
                          }}
                        />
                      </div>

                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

      {/* 3. SETTINGS MODAL (API Key Configuration) */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(3, 7, 18, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass" style={{
            width: '440px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-secondary)',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowSettings(false)}
              className="btn-hover"
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={18} />
            </button>

            <div>
              <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: 700 }}>Gemini API Config</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                Your API key is saved locally in your browser cache and is never sent to any server other than the Google API gateway.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Gemini API Key</label>
              <input 
                type="password" 
                defaultValue={userApiKey}
                id="api-key-input"
                placeholder="AIzaSy..." 
                style={{ width: '100%', padding: '0.65rem' }}
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Create a free API Key from the <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Google AI Studio Portal</a>.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
              <button 
                onClick={() => setShowSettings(false)}
                className="btn-hover"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '0.45rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
              
              <button 
                onClick={() => {
                  const input = document.getElementById('api-key-input') as HTMLInputElement;
                  if (input) saveApiKey(input.value);
                }}
                className="btn-hover"
                style={{
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.45rem 1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.8rem'
                }}
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
