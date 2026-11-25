"use client";

import {
  FormEvent,
  KeyboardEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  AudioLines,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  ChevronLeft,
  Circle,
  ClipboardList,
  FileText,
  Menu,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";

const OrbScene = dynamic(() => import("@/components/OrbScene"), { ssr: false });

type ChatMessage = { role: "user" | "assistant"; text: string };

const TAX_STEPS = [
  {
    title: "Read uploaded documents",
    description: "Open each selected file for document intake.",
  },
  {
    title: "Identify document types",
    description: "Classify statements, forms, and supporting files.",
  },
  {
    title: "Extract relevant details",
    description: "Prepare key fields for a review step.",
  },
  {
    title: "Check extraction results",
    description: "Flag items that may need your attention.",
  },
  {
    title: "Ready for your review",
    description: "Check your details before using a filing service.",
  },
];

function isTaxFilingRequest(text: string) {
  const normalized = text.toLowerCase();
  const taxTopic =
    /\b(tax|taxes|taxation|itr|income tax|tax return|return filing)\b/.test(
      normalized,
    );
  const action =
    /\b(file|filing|prepare|submit|do|start|help|complete|calculate|calculate my|file my)\b/.test(
      normalized,
    );
  return taxTopic && action;
}

export default function Home() {
  const [expanded, setExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [taxWorkflowStep, setTaxWorkflowStep] = useState<number | null>(null);
  const [activeTool, setActiveTool] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (expanded) textareaRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const maxHeight = Math.min(window.innerHeight * 0.22, 128);
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [prompt, expanded]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking, taxWorkflowStep]);

  useEffect(() => {
    if (taxWorkflowStep === null || taxWorkflowStep >= TAX_STEPS.length - 1)
      return;
    const timer = window.setTimeout(() => {
      setTaxWorkflowStep((current) =>
        current === null ? null : Math.min(current + 1, TAX_STEPS.length - 1),
      );
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [taxWorkflowStep]);

  useEffect(() => {
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
        setMobileSidebarOpen(false);
        textareaRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(
    () => () => {
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    },
    [],
  );

  function resetChat() {
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    setMessages([]);
    setPrompt("");
    setExpanded(false);
    setIsThinking(false);
    setTaxWorkflowStep(null);
    setActiveTool(false);
    setMobileSidebarOpen(false);
  }

  function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const text = prompt.trim();
    if (!text || isThinking) return;

    setMessages((current) => [...current, { role: "user", text }]);
    setPrompt("");
    setExpanded(false);
    setMobileSidebarOpen(false);

    if (isTaxFilingRequest(text)) {
      setTaxWorkflowStep(0);
      setIsThinking(false);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "I can guide you through preparing your tax return. I’ll walk through the steps and leave the final details for your review before any real submission.",
        },
      ]);
      return;
    }

    setTaxWorkflowStep(null);
    setIsThinking(true);
    responseTimerRef.current = setTimeout(() => {
      const isGreeting =
        /^(hi|hello|hey|good morning|good afternoon|good evening)[!. ]*$/i.test(
          text,
        );
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: isGreeting
            ? "Hey! How can I help you today?"
            : "I'm here to help. Tell me a little more about what you need.",
        },
      ]);
      setIsThinking(false);
    }, 700);
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
    if (event.key === "Escape") {
      setExpanded(false);
      textareaRef.current?.blur();
    }
  }

  const sidebarContent = (
    <div className="flex h-full w-[248px] flex-col px-3 py-4">
      <button
        onClick={resetChat}
        className="mb-7 flex items-center gap-3 px-2 text-left"
      >
        <BrandMark />
        <span className="text-[15px] font-semibold tracking-tight">
          ChatFlow
        </span>
      </button>
      <button
        onClick={resetChat}
        className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.075] px-3 py-2.5 text-sm text-slate-100 transition hover:bg-white/[0.11]"
      >
        <Plus size={17} className="text-slate-300" /> New chat
        <span className="ml-auto text-[10px] text-slate-600">⌘ K</span>
      </button>
      <div className="mb-2 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[.17em] text-slate-600">
        Workspace
      </div>
      <SidebarButton icon={<BookOpen size={16} />} label="Library" />
      <div className="mb-2 mt-8 flex items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-[.17em] text-slate-600">
        Recent chats <MoreHorizontal size={15} />
      </div>
      <div className="mt-auto">
        <div className="mb-3 h-px bg-white/[0.07]" />
        <button className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-white/[0.05]">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-indigo-400/30 to-blue-500/10 text-xs font-semibold text-indigo-100">
            RS
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium">Profile</div>
            <div className="mt-0.5 text-[10px] text-slate-500">Free plan</div>
          </div>
          <Settings2 size={15} className="text-slate-500" />
        </button>
      </div>
    </div>
  );

  return (
    <main className="noise relative flex h-[100dvh] min-h-[560px] overflow-hidden bg-[#080b12] text-slate-100">
      <AnimatePresence initial={false}>
        {sidebarOpen && !isMobile && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 248, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-30 hidden shrink-0 overflow-hidden border-r border-white/[0.07] bg-[#090c13]/90 md:block"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileSidebarOpen && isMobile && (
          <>
            <motion.button
              aria-label="Close navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -290 }}
              animate={{ x: 0 }}
              exit={{ x: -290 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 w-[min(82vw,280px)] overflow-hidden border-r border-white/10 bg-[#090c13]"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="soft-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,rgba(55,73,170,0.13),transparent_48%),radial-gradient(ellipse_at_85%_80%,rgba(78,39,160,0.09),transparent_36%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 overflow-hidden opacity-80">
          <div className="wave" />
          <div className="wave" />
          <div className="wave" />
        </div>

        <header className="relative z-20 flex h-[68px] shrink-0 items-center justify-between px-3 sm:px-7">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              aria-label="Toggle sidebar"
              onClick={() =>
                isMobile
                  ? setMobileSidebarOpen(true)
                  : setSidebarOpen((open) => !open)
              }
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
            >
              {isMobile ? (
                <Menu size={18} />
              ) : sidebarOpen ? (
                <ChevronLeft size={18} />
              ) : (
                <Menu size={18} />
              )}
            </button>
            <div className="flex items-center gap-2 md:hidden">
              <BrandMark small />
              <span className="text-sm font-semibold">ChatFlow</span>
            </div>
            <div className="hidden items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-400 sm:flex">
              ChatFlow <span className="text-slate-600">/</span>{" "}
              <span className="text-slate-300">New conversation</span>{" "}
              <ChevronDown size={13} />
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
            <Sparkles size={14} /> Action workspace
          </div>
        </header>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <AnimatePresence mode="wait">
            {messages.length === 0 ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12, scale: 0.985 }}
                transition={{ duration: 0.36, ease: "easeOut" }}
                className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-8"
              >
                <div className="relative h-[150px] w-full max-w-[420px] sm:h-[230px]">
                  <Suspense
                    fallback={
                      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/20 blur-2xl" />
                    }
                  >
                    <OrbScene />
                  </Suspense>
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute left-[21%] top-[42%] h-2 w-2 rounded-full bg-blue-300 shadow-[0_0_14px_4px_rgba(79,144,255,.5)]"
                  />
                  <motion.div
                    animate={{ y: [0, 10, 0], x: [0, 5, 0] }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute right-[20%] top-[30%] h-2.5 w-2.5 rounded-full bg-violet-300 shadow-[0_0_15px_4px_rgba(167,139,250,.35)]"
                  />
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.5 }}
                  className="relative -mt-1 text-center"
                >
                  <p className="mb-2 text-xs font-medium uppercase tracking-[.24em] text-indigo-300/75">
                    Your space of action
                  </p>
                  <h1 className="text-3xl font-medium tracking-[-.045em] text-slate-100 sm:text-[42px]">
                    start{" "}
                    <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
                      here.
                    </span>
                  </h1>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400 sm:text-[15px]">
                    File tax seamlessly, one step at a time.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => {
                        setPrompt("Help me file my taxes");
                        setExpanded(true);
                      }}
                      className="rounded-full border border-indigo-300/20 bg-indigo-400/[0.08] px-3.5 py-2 text-xs text-indigo-200 transition hover:bg-indigo-400/[0.15]"
                    >
                      Help me file my taxes
                    </button>
                    <button
                      onClick={() => {
                        setPrompt("What documents do I need for tax filing?");
                        setExpanded(true);
                      }}
                      className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs text-slate-300 transition hover:bg-white/[0.07]"
                    >
                      Tax document checklist
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="conversation"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 pb-6 pt-5 sm:px-8 sm:pt-8"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    New conversation
                  </span>
                  <button
                    onClick={resetChat}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <Plus size={13} /> New chat
                  </button>
                </div>
                <div className="space-y-6 sm:space-y-8">
                  {messages.map((message, index) => (
                    <motion.div
                      key={`${index}-${message.role}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28 }}
                      className={
                        message.role === "user"
                          ? "flex justify-end"
                          : "flex items-start gap-3"
                      }
                    >
                      {message.role === "assistant" && (
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-300/20 bg-indigo-400/10">
                          <Sparkles size={15} className="text-indigo-300" />
                        </div>
                      )}
                      <div
                        className={
                          message.role === "user"
                            ? "max-w-[88%] rounded-2xl rounded-br-md border border-indigo-300/15 bg-indigo-400/[0.12] px-4 py-3 text-sm leading-7 text-slate-100 sm:max-w-[85%]"
                            : "max-w-[calc(100%-2.75rem)] pt-1 text-sm leading-7 text-slate-300 sm:max-w-[85%]"
                        }
                      >
                        {message.text}
                      </div>
                    </motion.div>
                  ))}
                  <AnimatePresence>
                    {taxWorkflowStep !== null && (
                      <TaxFilingWorkflow
                        key="tax-workflow"
                        step={taxWorkflowStep}
                      />
                    )}
                  </AnimatePresence>
                  {isThinking && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 text-sm text-slate-400"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-300/20 bg-indigo-400/10">
                        <Sparkles size={15} className="text-indigo-300" />
                      </div>
                      <span className="flex gap-1">
                        <span className="animate-bounce">·</span>
                        <span className="animate-bounce [animation-delay:120ms]">
                          ·
                        </span>
                        <span className="animate-bounce [animation-delay:240ms]">
                          ·
                        </span>
                      </span>
                    </motion.div>
                  )}
                </div>
                <div ref={chatEndRef} className="h-5 shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-20 mx-auto w-full max-w-[790px] px-3 pb-3 sm:px-8 sm:pb-5">
            <motion.form
              layout
              onSubmit={sendMessage}
              initial={false}
              animate={{ borderRadius: expanded ? 25 : 999 }}
              transition={{
                type: "spring",
                stiffness: 330,
                damping: 30,
                mass: 0.85,
              }}
              className={`glass composer-glow relative z-10 flex w-full flex-col overflow-hidden border ${expanded ? "border-indigo-300/30" : "border-white/[0.08] hover:border-indigo-300/30"}`}
              onClick={() => {
                if (!expanded) setExpanded(true);
              }}
            >
              <div className="flex min-h-[58px] items-end gap-2 p-2 sm:gap-3 sm:p-2.5">
                <motion.div
                  layout
                  className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-400/20 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-indigo-300"
                >
                  <Sparkles size={17} />
                </motion.div>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onFocus={() => setExpanded(true)}
                  onKeyDown={onComposerKeyDown}
                  onClick={(event) => event.stopPropagation()}
                  rows={1}
                  placeholder="Message ChatFlow..."
                  aria-label="Message ChatFlow"
                  className="max-h-32 min-h-9 flex-1 resize-none self-center bg-transparent py-2 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500"
                />
                <motion.button
                  type="submit"
                  aria-label="Send message"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.92 }}
                  disabled={!prompt.trim() || isThinking}
                  className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/20 transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={18} strokeWidth={2.4} />
                </motion.button>
              </div>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, y: 9, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: 7, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center justify-between gap-3 px-3.5 pb-3 sm:px-4"
                  >
                    <div className="flex items-center gap-1.5">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        aria-label="Go to document upload page"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          window.location.assign("/upload");
                        }}
                        className={`flex h-8 items-center gap-2 rounded-full border px-3 text-[11px] transition ${activeTool ? "border-indigo-300/30 bg-indigo-400/15 text-indigo-200" : "border-white/[0.08] bg-white/[0.025] text-slate-400 hover:bg-white/[0.07] hover:text-slate-200"}`}
                      >
                        <Paperclip size={13} /> Attach
                      </motion.button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpanded(false);
                        }}
                        className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/[0.07] hover:text-slate-200"
                        aria-label="Collapse composer"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-600">
                      <AudioLines size={14} />
                      <span className="hidden sm:inline">
                        Shift + Enter for new line
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.form>
            <motion.p
              layout
              className="mt-2 text-center text-[10px] tracking-wide text-slate-600"
            >
              {expanded
                ? "Enter to send · Shift + Enter for a new line · Esc to close"
                : "ChatFlow can make mistakes. Check important information."}
            </motion.p>
          </div>
        </div>
      </section>
    </main>
  );
}

function TaxFilingWorkflow({ step }: { step: number }) {
  const progress = ((step + 1) / TAX_STEPS.length) * 100;
  const icons = [ClipboardList, FileText, ShieldCheck, Calculator, Check];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.35 }}
      className="w-full overflow-hidden rounded-2xl border border-indigo-300/20 bg-slate-900/80 p-3 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.18em] text-indigo-300 sm:text-xs">
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="h-2 w-2 rounded-full bg-indigo-400"
            />{" "}
            Document processing
          </div>
          <h3 className="mt-2 text-base font-semibold text-white sm:text-lg">
            {step === TAX_STEPS.length - 1
              ? "Document review preview complete"
              : "Processing your documents"}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
            Your selected files are moving through this visual processing
            workflow.
          </p>
        </div>
        <span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-400 to-cyan-300"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        />
      </div>
      <div className="mt-4 space-y-1 sm:mt-5">
        {TAX_STEPS.map((item, index) => {
          const Icon = icons[index];
          const completed = index < step;
          const active = index === step;
          return (
            <motion.div
              key={item.title}
              layout
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: index <= step ? 1 : 0.42, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.035 }}
              className={`flex items-start gap-2.5 rounded-xl p-2.5 sm:gap-3 sm:p-3 ${active ? "border border-indigo-300/20 bg-indigo-400/[0.08]" : "border border-transparent"}`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border sm:h-9 sm:w-9 ${completed ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300" : active ? "border-indigo-300/30 bg-indigo-400/15 text-indigo-200" : "border-white/10 bg-white/[0.03] text-slate-500"}`}
              >
                {completed ? (
                  <Check size={16} />
                ) : active ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Icon size={16} />
                  </motion.div>
                ) : (
                  <Circle size={15} />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={`text-xs font-medium sm:text-sm ${active ? "text-white" : completed ? "text-slate-300" : "text-slate-500"}`}
                >
                  {item.title}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
                  {item.description}
                </p>
              </div>
              <div className="pt-1 text-[9px] font-medium uppercase tracking-wider sm:text-[10px]">
                {completed ? (
                  <span className="text-emerald-300">Done</span>
                ) : active ? (
                  <span className="text-indigo-300">Active</span>
                ) : (
                  <span className="text-slate-600">Pending</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 p-3 text-[11px] leading-5 text-slate-400 sm:mt-4 sm:text-xs"
        >
          {step === TAX_STEPS.length - 1
            ? "Processing preview complete. This UI only selects files in your browser; it does not upload them to a server or extract/verify their contents yet. Connect a backend processor before using this with real tax documents."
            : `Current step: ${TAX_STEPS[step].title}. This is a front-end preview; connect each step to real file-upload and extraction results for production use.`}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 via-blue-500 to-violet-600 shadow-[0_0_18px_rgba(91,109,255,.28)] ${small ? "h-6 w-6" : "h-7 w-7"}`}
    >
      <span className="absolute inset-[2px] rounded-full bg-gradient-to-br from-blue-400 via-indigo-500 to-violet-800" />
      <span className="absolute left-[4px] top-[4px] h-[7px] w-[7px] rounded-full bg-cyan-200/90 blur-[1px]" />
    </span>
  );
}

function SidebarButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] text-slate-400 transition hover:bg-white/[0.055] hover:text-slate-100">
      {icon}
      {label}
    </button>
  );
}
