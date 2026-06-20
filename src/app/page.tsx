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
  Globe, 
  Trash2, 
  User, 
  AlertCircle, 
  AlertTriangle, 
  ChevronRight, 
  Info, 
  Mic, 
  Send,
  Loader,
  X,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle
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
}

const MOCK_LANDLORD_RESPONSE = {
  classification: {
    domain: 'Tenant',
    severity: 'Medium',
    keyEntities: ['Landlord', 'Security Deposit', '3 Months'],
    summary: 'Landlord has withheld the security deposit for 3 months after the tenancy ended.'
  },
  rights: `### Tenant Rights in India: Security Deposit Refund

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
  actionPlan: `### Step-by-Step Action Plan

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
  }, []);

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

  const loadCase = (caseObj: AnalysisResult) => {
    setActiveCaseId(caseObj.id);
    setProblem(caseObj.problem);
    setLanguage(caseObj.language);
    setDocumentContent(caseObj.document);
    
    // Parse personal details if available
    setSenderName('');
    setSenderAddress('');
    setOppositeName('');
    setOppositeAddress('');
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
    if (!apiToUse && !forceDemo) {
      setShowSettings(true);
      return;
    }

    setIsLoading(true);
    setCurrentStep(1);
    setActiveTab('overview');

    const stepsTimer = (step: number, delay: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setCurrentStep(step);
          resolve();
        }, delay);
      });
    };

    try {
      if (forceDemo) {
        await stepsTimer(1, 800); // Classifier
        await stepsTimer(2, 800); // RAG
        await stepsTimer(3, 800); // Explainer
        await stepsTimer(4, 800); // Planner
        await stepsTimer(5, 800); // Drafter
        
        const newCase: AnalysisResult = {
          id: Date.now().toString(),
          title: 'Landlord Deposit Refund Case',
          problem: problem || 'Landlord ne deposit wapas nahi kiya 3 mahine ho gaye',
          language,
          classification: MOCK_LANDLORD_RESPONSE.classification,
          rights: MOCK_LANDLORD_RESPONSE.rights,
          actionPlan: MOCK_LANDLORD_RESPONSE.actionPlan,
          document: MOCK_LANDLORD_RESPONSE.document,
          timestamp: new Date().toLocaleString()
        };

        const updatedHistory = [newCase, ...history];
        setHistory(updatedHistory);
        localStorage.setItem('nyayai_cases', JSON.stringify(updatedHistory));
        loadCase(newCase);
      } else {
        // Run actual api call
        await stepsTimer(1, 400); // Starting
        
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

        setCurrentStep(3); // Progress through steps
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to analyze case');
        }

        await stepsTimer(5, 400); // Finished drafting

        const newCase: AnalysisResult = {
          id: Date.now().toString(),
          title: `${data.classification.domain} Case - ${new Date().toLocaleDateString()}`,
          problem,
          language,
          classification: data.classification,
          rights: data.rights,
          actionPlan: data.actionPlan,
          document: data.document,
          timestamp: new Date().toLocaleString()
        };

        const updatedHistory = [newCase, ...history];
        setHistory(updatedHistory);
        localStorage.setItem('nyayai_cases', JSON.stringify(updatedHistory));
        loadCase(newCase);
      }
    } catch (error: any) {
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setIsLoading(false);
      setCurrentStep(0);
    }
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
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10.5);
      
      let y = margin;
      const lineHeight = 6.5;

      for (let i = 0; i < splitText.length; i++) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        
        const line = splitText[i];
        
        // Simple bold formatting for headers in PDF
        if (
          line.startsWith('SUBJECT:') || 
          line.startsWith('LEGAL NOTICE') || 
          line.startsWith('Dear Sir') || 
          line.startsWith('To,')
        ) {
          doc.setFont('Helvetica', 'bold');
        } else {
          doc.setFont('Helvetica', 'normal');
        }

        doc.text(line, margin, y);
        y += lineHeight;
      }

      doc.save(`legal_notice_${activeCaseId || 'draft'}.pdf`);
    } catch (e) {
      console.error('PDF Generation failed', e);
      alert('Failed to generate PDF. You can copy the text manually from the editor.');
    }
  };

  const activeCase = history.find(c => c.id === activeCaseId);

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* 1. SIDEBAR (Left) */}
      <div className="sidebar glass" style={{ width: '280px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', zIndex: 10 }}>
        
        {/* Brand Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--accent-primary)', padding: '0.5rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>NyayAI</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Legal Aid Agent</span>
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
            className="btn-new"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
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
              boxShadow: '0 4px 12px rgba(95, 93, 236, 0.25)',
              fontFamily: 'var(--font-display)'
            }}
          >
            <Plus size={18} /> New Consultation
          </button>
        </div>

        {/* History List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>History</span>
          
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No cases analyzed yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {history.map(item => (
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
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.classification.domain} Case
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.problem}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => deleteCase(item.id, e)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                    className="btn-delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer Controls */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={toggleTheme}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
          >
            <Globe size={16} /> Theme: {theme.toUpperCase()}
          </button>
          
          <button 
            onClick={() => setShowSettings(true)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Configure API Key"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
        
        {/* Main Header */}
        <div className="glass" style={{ padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase' }}>Indian Legal System AI</span>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              {activeCase ? `${activeCase.classification.domain} Redressal Desk` : 'AI Legal Consult'}
            </h2>
          </div>
          
          {/* Quick Language Toggle */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: '8px' }}>
            {['en', 'hi', 'hinglish'].map(lang => (
              <button 
                key={lang}
                onClick={() => setLanguage(lang)}
                style={{
                  padding: '0.25rem 0.75rem',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '2rem' }}>
            
            {!activeCase && !isLoading ? (
              // Empty State Input Form
              <div className="animate-slide" style={{ maxWidth: '700px', margin: '2rem auto', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.75rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Describe your legal issue</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Type or dictate your problem in Hindi, English, or Hinglish. Our multi-agent AI system will map your rights and draft a notice.
                  </p>
                </div>

                <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder="Example: Landlord ne contract khatam hone ke baad 3 mahine se security deposit wapas nahi kiya hai..."
                    style={{
                      width: '100%',
                      minHeight: '140px',
                      resize: 'vertical',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      lineHeight: '1.6',
                      padding: 0
                    }}
                  />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    {/* Voice Input Mock */}
                    <button 
                      onClick={handleVoiceInputMock}
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                      title="Simulate regional voice input"
                    >
                      <Mic size={16} className="pulse" style={{ color: 'var(--accent-danger)' }} /> 
                      Simulate Hindi Voice
                    </button>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        onClick={handleDemoClick}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          padding: '0.65rem 1.25rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: '0.875rem'
                        }}
                      >
                        Demo Case
                      </button>
                      <button 
                        onClick={() => runAnalysis(false)}
                        disabled={!problem.trim()}
                        style={{
                          background: 'var(--accent-primary)',
                          color: '#fff',
                          border: 'none',
                          padding: '0.65rem 1.5rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          opacity: problem.trim() ? 1 : 0.6
                        }}
                      >
                        Analyze Case <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* FAQ Cards */}
                <div style={{ marginTop: '3rem' }}>
                  <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={14} /> Common Scenarios Supported
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} onClick={() => setProblem('I was fired from my office without any notice, and they have withheld my last month salary and FnF clearances.')}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'block' }}>Labor Dispute</span>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Salary withholding & termination without notice.</p>
                    </div>
                    <div className="glass" style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} onClick={() => setProblem('Maine Amazon se ek smart TV order kiya tha Rs. 35,000 ka, screen damaged aayi and policy hone ke baad bhi product return ya refund reject kar diya.')}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'block' }}>Consumer Grievance</span>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Damaged goods refund rejection by vendor.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              // Loading sequence & Agent visualization
              <div style={{ maxWidth: '600px', margin: '4rem auto', width: '100%', textAlign: 'center' }}>
                <Loader className="spinner" size={48} style={{ color: 'var(--accent-primary)', marginBottom: '2rem' }} />
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>NyayAI agents are analyzing your case...</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '2.5rem' }}>
                  Using prompt chaining and local legal document vectors.
                </p>

                {/* Agent Chain Pipeline Display */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left', background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  {[
                    { id: 1, name: 'Classifier Agent', desc: 'Detecting legal domain, entities, and case severity' },
                    { id: 2, name: 'RAG Retriever', desc: 'Querying local database of Indian statutes' },
                    { id: 3, name: 'Rights Explainer Agent', desc: 'Mapping laws and translating rights (Hindi/English)' },
                    { id: 4, name: 'Action Planner Agent', desc: 'Compiling timelines, helplines, and procedures' },
                    { id: 5, name: 'Document Drafter Agent', desc: 'Formatting legal notice and letter drafts' }
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
                          opacity: isDone || isActive ? 1 : 0.4
                        }}
                      >
                        <div>
                          {isDone ? (
                            <CheckCircle size={20} color="var(--accent-success)" />
                          ) : isActive ? (
                            <Loader size={20} className="spinner" color="var(--accent-primary)" />
                          ) : (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                              {step.id}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                            {step.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {step.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Results Display (Interactive Tabs)
              <div className="animate-slide" style={{ width: '100%' }}>
                
                {/* Result Tabs Navigation */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '1.5rem' }}>
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
                          gap: '0.5rem',
                          paddingBottom: '0.75rem',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '2px solid',
                          borderColor: isActive ? 'var(--accent-primary)' : 'transparent',
                          color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          cursor: 'pointer'
                        }}
                      >
                        <IconComp size={16} /> {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Contents */}
                {activeTab === 'overview' && activeCase && (
                  <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                      <div className="glass" style={{ flex: 1, padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Detected Domain</span>
                        <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{activeCase.classification.domain}</h3>
                      </div>
                      
                      <div className="glass" style={{ flex: 1, padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Severity Level</span>
                        <span 
                          style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            display: 'inline-block',
                            marginTop: '0.5rem',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            background: 
                              activeCase.classification.severity.toLowerCase() === 'high' ? 'rgba(239, 68, 68, 0.15)' :
                              activeCase.classification.severity.toLowerCase() === 'medium' ? 'rgba(245, 158, 11, 0.15)' :
                              'rgba(16, 185, 129, 0.15)',
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

                    <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Key Entities Extracted</h4>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {activeCase.classification.keyEntities.map((ent, idx) => (
                          <span key={idx} style={{ background: 'var(--bg-tertiary)', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                            {ent}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="glass" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                      <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Case Summary</h4>
                      <p style={{ color: 'var(--text-secondary)' }}>{activeCase.classification.summary}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', alignItems: 'center' }}>
                      <AlertTriangle color="var(--accent-warning)" size={24} style={{ flexShrink: 0 }} />
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong>Disclaimer:</strong> NyayAI is an AI-powered educational legal aid tool. It provides legal notice drafts and explains basic acts/procedures under Indian Law, but it **does not substitute a professional lawyer or legal advice**. Consult a qualified attorney for legal action.
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'rights' && activeCase && (
                  <div className="animate-slide glass prose" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                    {/* Render basic custom styled markdown */}
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {activeCase.rights}
                    </div>
                  </div>
                )}

                {activeTab === 'action' && activeCase && (
                  <div className="animate-slide glass prose" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {activeCase.actionPlan}
                    </div>
                  </div>
                )}

                {activeTab === 'document' && activeCase && (
                  <div className="animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Edit the letter text directly below. You can customize the fields to automatically fill in details.
                      </p>
                      <button 
                        onClick={handleDownloadPDF}
                        style={{
                          background: 'var(--accent-success)',
                          color: '#fff',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                      >
                        <Download size={16} /> Download Notice PDF
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                      
                      {/* Notice Customizer Form */}
                      <div className="glass" style={{ width: '320px', padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content' }}>
                        <h4 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Customizer Tool</h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Your Name</label>
                          <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="E.g., Rahul Kumar" style={{ padding: '0.5rem' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Your Address</label>
                          <input type="text" value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} placeholder="Your full address" style={{ padding: '0.5rem' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Opposite Party Name</label>
                          <input type="text" value={oppositeName} onChange={(e) => setOppositeName(e.target.value)} placeholder="E.g., Ramesh (Landlord)" style={{ padding: '0.5rem' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Opposite Party Address</label>
                          <input type="text" value={oppositeAddress} onChange={(e) => setOppositeAddress(e.target.value)} placeholder="Opposite party address" style={{ padding: '0.5rem' }} />
                        </div>

                        {activeCase.classification.domain.toLowerCase() === 'tenant' && (
                          <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Claim Amount (Rs.)</label>
                              <input type="text" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="E.g., 20,000" style={{ padding: '0.5rem' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Property Location</label>
                              <input type="text" value={customProperty} onChange={(e) => setCustomProperty(e.target.value)} placeholder="Address of rental" style={{ padding: '0.5rem' }} />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Notice Document Text Editor */}
                      <div className="glass" style={{ flex: 1, padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <textarea
                          value={documentContent}
                          onChange={(e) => setDocumentContent(e.target.value)}
                          style={{
                            width: '100%',
                            minHeight: '480px',
                            background: '#fff',
                            color: '#1a1a1a',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            padding: '1.5rem',
                            fontFamily: 'Courier, monospace',
                            fontSize: '0.9rem',
                            lineHeight: '1.5',
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
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass" style={{
            width: '460px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-secondary)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            position: 'relative'
          }}>
            <button 
              onClick={() => setShowSettings(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Gemini API Settings</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Your API key is saved locally in your browser's storage and is not transmitted anywhere except directly to Google's API.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Gemini API Key</label>
              <input 
                type="password" 
                defaultValue={userApiKey}
                id="api-key-input"
                placeholder="AIzaSy..." 
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Get a free API Key from the <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Google AI Studio Portal</a>.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button 
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '0.5rem 1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              
              <button 
                onClick={() => {
                  const input = document.getElementById('api-key-input') as HTMLInputElement;
                  if (input) saveApiKey(input.value);
                }}
                style={{
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.5rem 1.5rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
