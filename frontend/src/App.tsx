import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Send,
    Settings,
    Target,
    Zap,
    AlertTriangle,
    History,
    Trash2,
    ChevronRight,
    ShieldCheck,
    Cpu,
    X,
    Save,
    Server,
    Terminal,
    Copy,
    Check,
    Bot,
    User,
    ChevronDown,
    Activity,
    Info,
    LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    phase?: string;
    metadata?: {
        confidence: { score: number, reasons: string[] };
        phase: string;
    };
}

interface GoalState {
    goal: string;
    constraints: string[];
    progress: string;
}

interface SettingsState {
    model: string;
    base_url: string;
    custom_system_prompt: string;
}

const variants = {
    fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } },
    slideUp: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 }, transition: { duration: 0.3, ease: 'easeOut' } },
    staggerContainer: { initial: { opacity: 0 }, animate: { opacity: 1, transition: { staggerChildren: 0.1 } } }
};

export default function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<{ goal: GoalState, memory: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<SettingsState>({
        model: 'glm-5:cloud',
        base_url: 'http://localhost:11434/v1',
        custom_system_prompt: ''
    });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [apiUrl] = useState('http://localhost:8000');
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await axios.get(`${apiUrl}/status`);
            setStatus(res.data);
        } catch (e) { console.error("Failed to fetch status", e); }
    }, [apiUrl]);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await axios.get(`${apiUrl}/settings`);
            setSettings(res.data);
        } catch (e) { console.error("Failed to fetch settings", e); }
    }, [apiUrl]);

    useEffect(() => {
        fetchStatus();
        fetchSettings();
    }, [fetchStatus, fetchSettings]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const saveSettings = async (newSettings: SettingsState) => {
        try {
            await axios.post(`${apiUrl}/settings`, newSettings);
            setSettings(newSettings);
            setIsSettingsOpen(false);
        } catch (e) { console.error("Failed to save settings", e); }
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await fetch(`${apiUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input,
                    history: messages.map(({ role, content }) => ({ role, content })),
                    model: settings.model
                })
            });
            if (!response.body) throw new Error('No body');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMsg: Message = { role: 'assistant', content: '' };
            setMessages(prev => [...prev, assistantMsg]);

            let buffer = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('METADATA:')) {
                        try {
                            const meta = JSON.parse(line.replace('METADATA:', ''));
                            setMessages(prev => {
                                const next = [...prev];
                                next[next.length - 2].phase = meta.phase;
                                next[next.length - 1].metadata = meta;
                                return next;
                            });
                        } catch (e) { console.error("Metadata parse error", e); }
                    } else if (line.startsWith('ERROR:')) {
                        assistantMsg.content += `[Error] ${line.replace('ERROR:', '')}`;
                    } else {
                        assistantMsg.content += line + '\n';
                    }
                }

                setMessages(prev => {
                    const next = [...prev];
                    next[next.length - 1] = { ...assistantMsg, content: assistantMsg.content + buffer };
                    return next;
                });
            }

            if (buffer) {
                assistantMsg.content += buffer;
                setMessages(prev => {
                    const next = [...prev];
                    next[next.length - 1] = { ...assistantMsg };
                    return next;
                });
            }
            fetchStatus();
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e}` }]);
        } finally { setLoading(false); }
    };

    return (
        <div className="flex h-screen w-full bg-[#0a0b14] text-slate-200 overflow-hidden font-sans">
            {/* Sidebar with glass panel */}
            <aside className="w-80 h-full glass-panel flex flex-col p-6 space-y-8 select-none relative z-10 overflow-hidden">
                <div className="flex items-center gap-4 group cursor-default">
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition-all duration-300">
                        <Zap className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white font-display">V6 Assistant</h1>
                        <p className="text-[10px] uppercase tracking-widest text-blue-500 font-bold opacity-80">Pro Edition</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-8 overflow-y-auto scroll-hide">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            <Target className="w-3.5 h-3.5" /> Current Objective
                        </div>
                        <div className="glass-card p-5 border-white/[0.05] relative overflow-hidden group">
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <p className="text-sm font-medium leading-relaxed italic text-slate-300 relative z-10">
                                {status?.goal.goal || "Waiting for parameters..."}
                            </p>
                        </div>
                    </section>

                    {status?.goal.constraints.length ? (
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                <ShieldCheck className="w-3.5 h-3.5" /> System Constraints
                            </div>
                            <div className="space-y-2.5">
                                {status.goal.constraints.map((c, i) => (
                                    <motion.div 
                                        key={i} 
                                        initial={{ opacity: 0, x: -10 }} 
                                        animate={{ opacity: 1, x: 0 }} 
                                        transition={{ delay: i * 0.1 }}
                                        className="p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl text-xs flex items-start gap-3 hover:bg-white/[0.05] transition-colors"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                        <span className="text-slate-400 leading-relaxed">{c}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {status?.memory && (
                        <section className="space-y-4">
                             <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                <Activity className="w-3.5 h-3.5" /> Context Memory
                            </div>
                            <div className="glass-card p-4 text-[11px] text-slate-500 font-mono leading-relaxed bg-black/20">
                                {status.memory}
                            </div>
                        </section>
                    )}
                </nav>

                <div className="pt-6 border-t border-white/[0.05]">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-full flex items-center justify-between p-4 rounded-[1.2rem] bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] transition-all duration-300 text-slate-400 hover:text-white group"
                    >
                        <div className="flex items-center gap-3">
                            <Settings className="w-4.5 h-4.5 group-hover:rotate-45 transition-transform duration-500" />
                            <span className="text-sm font-semibold tracking-wide">Configure</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative h-full">
                {/* Refined Header */}
                <header className="h-20 border-b border-white/[0.05] flex items-center px-12 justify-between backdrop-blur-xl bg-black/10 z-10">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-green-500/5 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                            <span className="text-[11px] font-bold tracking-widest text-green-400 uppercase">Live Node</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono bg-white/[0.03] px-4 py-1.5 rounded-full border border-white/[0.05]">
                            <Cpu className="w-3.5 h-3.5 text-blue-500" /> 
                            <span className="opacity-80">{settings.model}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2.5 rounded-xl hover:bg-white/5 transition-colors text-slate-500 hover:text-white">
                            <History className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Message Scroll Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 space-y-10 scroll-hide relative">
                    {/* Background Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-500/5 blur-[120px] pointer-events-none -z-10" />
                    
                    <AnimatePresence mode="popLayout">
                        {messages.length === 0 && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center space-y-6"
                            >
                                <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 shadow-2xl">
                                    <Bot className="w-16 h-16 text-blue-500" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-white font-display">Awaiting Initialization</h2>
                                    <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
                                        Establish a connection parameters or initiate a query to begin processing.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                        {messages.map((msg, idx) => (
                            <MessageBubble key={idx} msg={msg} />
                        ))}
                    </AnimatePresence>
                    {loading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 p-6 ml-12">
                            <div className="flex space-x-1.5">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Polished Input Area */}
                <div className="p-12 pt-0 relative z-20">
                    <div className="max-w-4xl mx-auto">
                        <div className="relative glass-card bg-black/40 border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2">
                            <div className="flex items-center gap-2 px-4 py-2">
                                <input 
                                    value={input} 
                                    onChange={(e) => setInput(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                                    placeholder="Enter command or query..." 
                                    className="flex-1 bg-transparent border-none outline-none text-white text-base py-3 px-2 placeholder:text-slate-600 font-medium" 
                                />
                                <button 
                                    onClick={handleSend} 
                                    disabled={loading || !input.trim()}
                                    className={cn(
                                        "p-4 rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg",
                                        loading || !input.trim() 
                                            ? "bg-slate-800 text-slate-600" 
                                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 hover:scale-105 active:scale-95"
                                    )}
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-center mt-4 gap-6">
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold opacity-50">
                                <Info className="w-3 h-3" /> Ready for deployment
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modals */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <SettingsModal
                        settings={settings}
                        onClose={() => setIsSettingsOpen(false)}
                        onSave={saveSettings}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function MessageBubble({ msg }: { msg: Message }) {
    const isAssistant = msg.role === 'assistant';
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.98 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            className={cn(
                "flex flex-col gap-4 max-w-5xl", 
                isAssistant ? "mr-auto" : "ml-auto items-end"
            )}
        >
            <div className={cn(
                "flex items-center gap-3",
                isAssistant ? "flex-row" : "flex-row-reverse"
            )}>
                <div className={cn(
                    "p-2 rounded-xl border",
                    isAssistant ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-white/5 border-white/10 text-slate-400"
                )}>
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {isAssistant ? 'Assistant Core' : 'Authorized Operator'}
                </span>
                {msg.phase && (
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {msg.phase}
                    </span>
                )}
            </div>

            <div className={cn(
                "p-8 rounded-[2rem] text-[15px] leading-relaxed relative group transition-all duration-300", 
                isAssistant 
                    ? "glass-card rounded-tl-none border-white/[0.08] text-slate-200" 
                    : "bg-blue-600/10 border border-blue-500/20 rounded-tr-none text-white shadow-[0_0_30px_rgba(59,130,246,0.05)]"
            )}>
                {isAssistant ? (
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({ children }) => <p className="mb-5 last:mb-0">{children}</p>,
                            code: (props: any) => <CodeBlock {...props} />,
                            ul: ({ children }) => <ul className="list-disc ml-6 mb-5 space-y-3">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-6 mb-5 space-y-3">{children}</ol>,
                            h1: ({ children }) => <h1 className="text-2xl font-bold mb-6 text-white font-display border-b border-white/5 pb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-bold mb-4 text-white font-display">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-bold mb-3 text-white">{children}</h3>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500/50 pl-6 py-2 italic text-slate-400 my-6 bg-white/[0.02] rounded-r-xl">{children}</blockquote>
                        }}
                    >
                        {msg.content}
                    </ReactMarkdown>
                ) : (
                    msg.content
                )}
            </div>

            {msg.metadata?.confidence && msg.metadata.confidence.score < 80 && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-xs text-amber-500 mt-1 max-w-fit shadow-lg shadow-amber-900/10"
                >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold uppercase tracking-widest text-[10px]">Low Confidence Detection</span>
                        <span className="opacity-80">Score: {msg.metadata.confidence.score}% • {msg.metadata.confidence.reasons[0]}</span>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

function CodeBlock({ children, className, ...props }: any) {
    const [copied, setCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const content = String(children).replace(/\n$/, '');

    const copyToClipboard = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!language) {
        return (
            <code className="bg-white/10 px-2 py-0.5 rounded text-blue-300 font-mono text-[13px] border border-white/5" {...props}>
                {children}
            </code>
        );
    }

    return (
        <div className="my-8 rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/60 group/code relative">
            <div className="bg-white/5 px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/[0.08] flex justify-between items-center backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                    <span className="ml-2 opacity-60 tracking-tighter">{language}</span>
                </div>
                <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg active:scale-95"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Source'}</span>
                </button>
            </div>
            <SyntaxHighlighter
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                customStyle={{
                    margin: 0,
                    padding: '1.5rem 2rem',
                    background: 'rgba(0,0,0,0.5)',
                    fontSize: '13px',
                    lineHeight: '1.6',
                }}
                {...props}
            >
                {content}
            </SyntaxHighlighter>
        </div>
    );
}

function SettingsModal({ settings, onClose, onSave }: { settings: SettingsState, onClose: () => void, onSave: (s: SettingsState) => void }) {
    const [localSettings, setLocalSettings] = useState(settings);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 40 }}
                className="bg-[#0b0c15] border border-white/[0.08] rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh] relative"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] pointer-events-none" />
                
                <div className="p-10 border-b border-white/[0.05] flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-slate-500/5 border border-white/10 text-slate-400">
                            <Settings className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white font-display">System Core</h2>
                            <p className="text-[10px] text-blue-500 uppercase tracking-[0.2em] font-bold opacity-80 mt-1">LLM Configuration Interface</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-all text-slate-500 hover:text-white hover:rotate-90">
                        <X className="w-7 h-7" />
                    </button>
                </div>

                <div className="p-10 space-y-10 overflow-y-auto relative z-10 scroll-hide">
                    <div className="grid grid-cols-1 gap-10">
                        <div className="space-y-4">
                            <label className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                                <Cpu className="w-4 h-4 text-blue-500" /> Primary Model Target
                            </label>
                            <input
                                value={localSettings.model}
                                onChange={e => setLocalSettings({ ...localSettings, model: e.target.value })}
                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 py-4 text-[15px] text-white focus:outline-none focus:border-blue-500/50 focus:bg-blue-500/[0.02] transition-all shadow-inner"
                                placeholder="e.g. gpt-4, glm-5:cloud"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                                <Server className="w-4 h-4 text-blue-500" /> Infrastructure Host
                            </label>
                            <input
                                value={localSettings.base_url}
                                onChange={e => setLocalSettings({ ...localSettings, base_url: e.target.value })}
                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 py-4 text-[14px] text-white font-mono focus:outline-none focus:border-blue-500/50 focus:bg-blue-500/[0.02] transition-all shadow-inner"
                                placeholder="http://localhost:11434/v1"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                                <Terminal className="w-4 h-4 text-blue-500" /> Override System Protocol
                            </label>
                            <textarea
                                value={localSettings.custom_system_prompt}
                                onChange={e => setLocalSettings({ ...localSettings, custom_system_prompt: e.target.value })}
                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-[1.8rem] px-6 py-5 text-[15px] text-white focus:outline-none focus:border-blue-500/50 focus:bg-blue-500/[0.02] transition-all h-48 resize-none leading-relaxed shadow-inner"
                                placeholder="Define high-level operational directives..."
                            />
                            <div className="flex items-center gap-2 px-2">
                                <Info className="w-3.5 h-3.5 text-slate-600" />
                                <p className="text-[11px] text-slate-500 italic">Directive priority: System {'>'} User Context.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-10 pt-6 border-t border-white/[0.05] flex justify-end gap-4 relative z-10">
                    <button onClick={onClose} className="px-8 py-4 rounded-2xl font-bold text-sm text-slate-400 hover:text-white transition-colors">
                        Discard
                    </button>
                    <button
                        onClick={() => onSave(localSettings)}
                        className="flex items-center gap-3 px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all font-bold text-sm shadow-[0_10px_30px_rgba(37,99,235,0.2)] hover:shadow-[0_15px_40px_rgba(37,99,235,0.3)] active:scale-95"
                    >
                        <Save className="w-4.5 h-4.5" /> Save Protocol
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

