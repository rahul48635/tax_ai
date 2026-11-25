"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  File,
  ShieldCheck,
  LockKeyhole,
  X,
  Copy,
  Check,
  AlertTriangle,
  LoaderCircle,
} from "lucide-react";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAGIC = new Uint8Array([0x43, 0x46, 0x30, 0x31]); // CF01

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState(false);

  function selectFile(selected?: File) {
    setError("");
    setStatus("");
    setUploaded(false);
    setKey("");

    if (!selected) return;

    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("File exceeds the 25 MB limit.");
      return;
    }

    if (selected.size === 0) {
      setFile(null);
      setError("Empty files cannot be uploaded.");
      return;
    }

    setFile(selected);
  }

  async function handleUpload() {
    if (!file || busy) return;

    if (!window.isSecureContext || !crypto.subtle) {
      setError("Secure browser encryption requires HTTPS or localhost.");
      return;
    }

    setBusy(true);
    setError("");
    setKey("");
    setStatus("Encrypting your file...");

    try {
      // Generate a fresh, cryptographically secure AES-256 key.
      const cryptoKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = await file.arrayBuffer();

      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, tagLength: 128 },
        cryptoKey,
        plaintext,
      );

      // Export the key so the user can save it separately.
      const rawKey = new Uint8Array(
        await crypto.subtle.exportKey("raw", cryptoKey),
      );
      const encodedKey = toBase64(rawKey);

      // Format: CF01 magic bytes | 12-byte IV | encrypted bytes + GCM tag.
      const encryptedBytes = new Uint8Array(ciphertext);
      const output = new Uint8Array(
        MAGIC.length + iv.length + encryptedBytes.length,
      );

      output.set(MAGIC, 0);
      output.set(iv, MAGIC.length);
      output.set(encryptedBytes, MAGIC.length + iv.length);

      const encryptedBlob = new Blob([output], {
        type: "application/octet-stream",
      });

      const formData = new FormData();
      formData.append("file", encryptedBlob, "encrypted.cfenc");
      formData.append("originalName", file.name);

      setStatus("Uploading encrypted data...");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 413
            ? "The server rejected the file size."
            : "Upload failed. Check your server and try again.",
        );
      }

      // Reveal the decryption key only after successful upload.
      setKey(encodedKey);
      setUploaded(true);
      setStatus("Encrypted file uploaded successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Encryption or upload failed.",
      );
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access failed. Copy the key manually.");
    }
  }

  function reset() {
    if (busy) return;
    setFile(null);
    setKey("");
    setStatus("");
    setError("");
    setUploaded(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080b14] px-4 py-12 text-slate-100">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#64748b12_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full max-w-xl"
      >
        <div className="mb-7 text-center">
          <motion.div
            initial={{ scale: 0.8, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-indigo-500/20 to-cyan-400/10 shadow-lg shadow-indigo-500/10"
          >
            <LockKeyhole className="h-7 w-7 text-indigo-300" />
          </motion.div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Secure file{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-300 bg-clip-text text-transparent">
              upload
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
            Encrypt files in your browser before sending them to the server.
            Your encryption key stays with you.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-700/70 bg-slate-900/85 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-medium text-slate-100">Upload a file</h2>
              <p className="mt-1 text-xs text-slate-500">
                Maximum file size: 25 MB
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5 text-xs text-emerald-300">
              <ShieldCheck size={14} />
              AES-256-GCM
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => selectFile(e.target.files?.[0])}
          />

          <motion.button
            type="button"
            disabled={busy || uploaded}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              selectFile(e.dataTransfer.files?.[0]);
            }}
            whileTap={{ scale: 0.99 }}
            className={`flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-7 transition-all duration-300 disabled:cursor-not-allowed ${
              dragging
                ? "border-cyan-300 bg-cyan-400/10"
                : file
                  ? "border-indigo-400/50 bg-indigo-500/[0.06]"
                  : "border-slate-700 bg-slate-950/50 hover:border-indigo-400/60 hover:bg-indigo-500/[0.04]"
            }`}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300">
              {file ? <File size={22} /> : <Upload size={22} />}
            </div>
            <span className="max-w-full break-all text-sm font-medium text-slate-200">
              {file ? file.name : "Drop your file here"}
            </span>
            <span className="mt-2 text-xs text-slate-500">
              {file
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB · Selected`
                : "or click to browse your device"}
            </span>
          </motion.button>

          <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
            <p className="text-xs leading-5 text-slate-400">
              A fresh 256-bit key and a unique 96-bit nonce are generated for
              each upload. The server receives encrypted file contents.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300"
              >
                <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {uploaded && key && (
              <motion.div
                key="key"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
                  <AlertTriangle size={17} />
                  Save your encryption key
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Save this key somewhere secure. You will need it to decrypt
                  the file. It is not stored by this page.
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3">
                  <code className="min-w-0 flex-1 break-all text-xs text-cyan-200">
                    {key}
                  </code>
                  <button
                    type="button"
                    onClick={copyKey}
                    className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                    aria-label="Copy encryption key"
                  >
                    {copied ? <Check size={17} /> : <Copy size={17} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([key], {
                      type: "text/plain;charset=utf-8",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "chatflow-encryption-key.txt";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="mt-3 text-xs font-medium text-cyan-300 hover:text-cyan-200"
                >
                  Download key backup
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-5 flex gap-3">
            {file && (
              <button
                type="button"
                disabled={busy}
                onClick={reset}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-40"
                aria-label="Remove selected file"
              >
                <X size={18} />
              </button>
            )}

            <motion.button
              type="button"
              disabled={!file || busy || uploaded}
              onClick={handleUpload}
              whileHover={!busy && file && !uploaded ? { scale: 1.01 } : {}}
              whileTap={!busy && file && !uploaded ? { scale: 0.98 } : {}}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {busy ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : uploaded ? (
                <Check size={18} />
              ) : (
                <LockKeyhole size={17} />
              )}
              {busy
                ? status
                : uploaded
                  ? "Upload complete"
                  : "Encrypt & upload"}
            </motion.button>
          </div>

          {status && !busy && (
            <p className="mt-3 text-center text-xs text-emerald-300">
              {status}
            </p>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-slate-600">
          Protected in transit with HTTPS · Client-side encryption
        </p>
      </motion.section>
    </main>
  );
}
