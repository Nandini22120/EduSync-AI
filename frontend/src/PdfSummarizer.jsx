import { useState, useRef } from "react";
import "./StudyComponents.css";

function PdfSummarizer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summaryData, setSummaryData] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    setError("");

    if (!selected) return;

    // Validate PDF type
    if (!selected.name.toLowerCase().endsWith(".pdf") && selected.type !== "application/pdf") {
      setError("Please select a valid PDF file (.pdf).");
      setFile(null);
      return;
    }

    // Validate size (10 MB limit)
    if (selected.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10 MB. Please upload a smaller PDF document.");
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleSummarize = async () => {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setLoading(true);
    setError("");
    setSummaryData(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please log in to use the AI PDF Summarizer.");

      const response = await fetch("http://localhost:5000/api/study/summarize-pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to generate summary.");
      }

      setSummaryData(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (summaryData?.summary) {
      navigator.clipboard.writeText(summaryData.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSummaryData(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="study-container">
      <div className="study-card">
        <h2>📄 AI PDF Document Summarizer</h2>
        <p className="subtitle">
          Upload textbook chapters, lecture slides, or study handouts to get a clear, structured summary powered by Gemini AI.
        </p>

        {error && <div className="msg-banner error">{error}</div>}

        {/* Dropzone */}
        <div
          className="upload-dropzone"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            style={{ display: "none" }}
          />
          <div className="upload-icon">📁</div>
          <strong style={{ fontSize: "16px", color: "#171b35", display: "block" }}>
            {file ? file.name : "Click to browse or drop your PDF document here"}
          </strong>
          <span style={{ fontSize: "13px", color: "#85899b", display: "block", marginTop: "6px" }}>
            {file
              ? `${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to summarize`
              : "Supports PDF study materials up to 10 MB"}
          </span>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            className="teacher-btn"
            onClick={handleSummarize}
            disabled={!file || loading}
          >
            {loading ? "Extracting & Summarizing with Gemini..." : "✨ Generate AI Summary"}
          </button>

          {(file || summaryData) && (
            <button
              className="teacher-btn secondary"
              onClick={handleReset}
              disabled={loading}
            >
              Reset
            </button>
          )}
        </div>

        {/* Summary output */}
        {summaryData && (
          <div style={{ marginTop: "25px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: "16px" }}>Summary of {summaryData.fileName}</strong>
                <p style={{ fontSize: "12px", color: "#85899b" }}>
                  Extracted {summaryData.extractedCharacters.toLocaleString()} characters
                </p>
              </div>
              <button className="teacher-btn secondary" onClick={handleCopy}>
                {copied ? "✓ Copied!" : "📋 Copy Summary"}
              </button>
            </div>

            <div className="summary-output">
              {summaryData.summary}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PdfSummarizer;

