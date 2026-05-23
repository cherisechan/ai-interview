"use client";

import { useRef, useState } from "react";

type InputMode = "record" | "type";

type FeedbackPayload = {
  overall_score?: number;
  role_alignment_score?: number;
  technical_depth_score?: number;
  communication_score?: number;
  matched_requirements?: string[];
  missing_keywords?: string[];
  strengths?: string[];
  weaknesses?: string[];
  improved_answer?: string;
  next_steps?: string[];
  raw_feedback?: string;
};

type ApiFeedback = {
  feedback?: FeedbackPayload;
};

export default function Home() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [jobDescription, setJobDescription] = useState("");
  const [question, setQuestion] = useState(
    "Tell me about a difficult technical problem you solved."
  );

  const [inputMode, setInputMode] = useState<InputMode>("record");
  const [typedAnswer, setTypedAnswer] = useState("");

  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<ApiFeedback | null>(null);
  const [loading, setLoading] = useState(false);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: "audio/webm",
      });

      setAudioBlob(blob);
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function resetResults() {
    setFeedback(null);
    setTranscript("");
  }

  function validateJobDescription() {
    if (!jobDescription.trim()) {
      alert("Paste a job description first.");
      return false;
    }

    return true;
  }

  async function submitRecordedFeedback() {
    if (!audioBlob) {
      alert("Record an answer first.");
      return;
    }

    if (!validateJobDescription()) return;

    setLoading(true);
    resetResults();

    const formData = new FormData();
    formData.append("audio", audioBlob, "answer.webm");
    formData.append("job_description", jobDescription);
    formData.append("question", question);

    try {
      const res = await fetch("https://ai-interview-mocha-ten.vercel.app/feedback", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate feedback.");
      }

      setTranscript(data.transcript);
      setFeedback(data.feedback);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function submitTypedFeedback() {
    if (!typedAnswer.trim()) {
      alert("Type an answer first.");
      return;
    }

    if (!validateJobDescription()) return;

    setLoading(true);
    resetResults();

    try {
      const res = await fetch("https://ai-interview-mocha-ten.vercel.app/feedback-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_description: jobDescription,
          question,
          answer: typedAnswer,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate feedback.");
      }

      setTranscript(typedAnswer);
      setFeedback(data.feedback);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#ffe4f6] via-[#f3e8ff] to-[#dbeafe] px-6 py-10 text-[#241b35]">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="relative overflow-hidden rounded-3xl border border-pink-200/60 bg-white/50 p-10 shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-300/20 via-purple-300/20 to-blue-300/20" />

          <div className="relative z-10">
            <h1 className="text-5xl font-bold tracking-tight text-[#2b1b43]">
              AI Interview Coach
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-[#5f5470]">
              Upload a job description, record or type your response and
              receive role-specific feedback powered by speech transcription,
              semantic retrieval and LLM evaluation.
            </p>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-xl">
            <label className="font-semibold text-[#2b1b43]">
              Job Description
            </label>

            <textarea
              className="mt-3 h-80 w-full rounded-2xl border border-pink-100 bg-white/70 p-4 text-sm text-[#2b1b43] outline-none transition placeholder:text-[#9d8fb3] focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
            />
          </section>

          <div className="space-y-8">
            <section className="rounded-3xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-xl">
              <label className="font-semibold text-[#2b1b43]">
                Interview Question
              </label>

              <input
                className="mt-3 w-full rounded-2xl border border-pink-100 bg-white/70 p-4 text-sm text-[#2b1b43] outline-none transition placeholder:text-[#9d8fb3] focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </section>

            <section className="rounded-3xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-xl">
              <h2 className="font-semibold text-[#2b1b43]">
                Answer Response
              </h2>

              <p className="mt-2 text-sm text-[#6f6380]">
                Record or type your interview response to generate AI feedback.
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setInputMode("record")}
                  className={`rounded-xl px-5 py-2 text-sm font-medium transition-all duration-200 ${
                    inputMode === "record"
                      ? "border border-purple-200 bg-white text-[#2b1b43] shadow-sm"
                      : "border border-transparent bg-transparent text-[#7b6a99] hover:bg-white/40"
                  }`}
                >
                  Record
                </button>

                <button
                  onClick={() => setInputMode("type")}
                  className={`rounded-xl px-5 py-2 text-sm font-medium transition-all duration-200 ${
                    inputMode === "type"
                      ? "border border-purple-200 bg-white text-[#2b1b43] shadow-sm"
                      : "border border-transparent bg-transparent text-[#7b6a99] hover:bg-white/40"
                  }`}
                >
                  Type
                </button>
              </div>

              {inputMode === "record" && (
                <div className="mt-5">
                  <div className="flex flex-wrap gap-3">
                    {!recording ? (
                      <button
                        onClick={startRecording}
                        className="rounded-2xl bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 px-6 py-3 font-semibold text-white shadow-lg shadow-pink-200 transition hover:scale-[1.02]"
                      >
                        Start Recording
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="rounded-2xl bg-gradient-to-r from-rose-400 to-pink-400 px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.02]"
                      >
                        Stop Recording
                      </button>
                    )}

                    <button
                      onClick={submitRecordedFeedback}
                      disabled={loading}
                      className="rounded-2xl bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 px-6 py-3 font-semibold text-white shadow-lg shadow-purple-200 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Generating..." : "Generate Feedback"}
                    </button>
                  </div>

                  {audioBlob && (
                    <div className="mt-5 rounded-2xl border border-pink-100 bg-white/60 p-4">
                      <p className="mb-3 text-sm text-[#6f6380]">
                        Recorded audio
                      </p>

                      <audio
                        controls
                        className="w-full"
                        src={URL.createObjectURL(audioBlob)}
                      />
                    </div>
                  )}
                </div>
              )}

              {inputMode === "type" && (
                <div className="mt-5">
                  <textarea
                    className="h-56 w-full rounded-2xl border border-pink-100 bg-white/70 p-4 text-sm text-[#2b1b43] outline-none transition placeholder:text-[#9d8fb3] focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
                    placeholder="Type your interview answer here..."
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                  />

                  <button
                    onClick={submitTypedFeedback}
                    disabled={loading}
                    className="mt-4 rounded-2xl bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 px-6 py-3 font-semibold text-white shadow-lg shadow-purple-200 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Generating..." : "Generate Feedback"}
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>

        {transcript && (
          <section className="rounded-3xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-xl">
            <h2 className="text-2xl font-bold text-[#2b1b43]">Transcript</h2>

            <p className="mt-4 whitespace-pre-wrap rounded-2xl border border-pink-100 bg-white/70 p-5 text-sm leading-7 text-[#4c3f63]">
              {transcript}
            </p>
          </section>
        )}

        {feedback?.feedback?.raw_feedback && (
          <section className="rounded-3xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-xl">
            <h2 className="text-2xl font-bold text-[#2b1b43]">
              Raw Feedback
            </h2>

            <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-pink-100 bg-white/70 p-5 text-sm leading-7 text-[#4c3f63]">
              {feedback.feedback.raw_feedback}
            </pre>
          </section>
        )}

        {feedback?.feedback && (
          <section className="rounded-3xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-xl">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple-500">
                  Evaluation
                </p>

                <h2 className="mt-2 text-3xl font-bold text-[#2b1b43]">
                  Interview Feedback
                </h2>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <ScoreCard
                label="Overall"
                value={feedback.feedback.overall_score}
              />
              <ScoreCard
                label="Role Alignment"
                value={feedback.feedback.role_alignment_score}
              />
              <ScoreCard
                label="Technical Depth"
                value={feedback.feedback.technical_depth_score}
              />
              <ScoreCard
                label="Communication"
                value={feedback.feedback.communication_score}
              />
            </div>

            <FeedbackList
              title="Matched Requirements"
              items={feedback.feedback.matched_requirements}
            />

            <FeedbackList
              title="Missing Keywords"
              items={feedback.feedback.missing_keywords}
            />

            <FeedbackList
              title="Strengths"
              items={feedback.feedback.strengths}
            />

            <FeedbackList
              title="Weaknesses"
              items={feedback.feedback.weaknesses}
            />

            {feedback.feedback.improved_answer && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-[#2b1b43]">
                  Improved Answer
                </h3>

                <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-pink-200 bg-gradient-to-r from-pink-100/70 via-purple-100/60 to-blue-100/70 p-5 text-sm leading-7 text-[#4c3f63]">
                  {feedback.feedback.improved_answer}
                </p>
              </div>
            )}

            <FeedbackList
              title="Next Steps"
              items={feedback.feedback.next_steps}
            />
          </section>
        )}
      </div>
    </main>
  );
}

function ScoreCard({
  label,
  value,
}: {
  label: string;
  value?: number;
}) {
  return (
    <div className="rounded-2xl border border-white/40 bg-gradient-to-br from-pink-100/60 via-purple-100/50 to-blue-100/60 p-5 shadow-lg backdrop-blur-xl">
      <p className="text-sm text-[#7b6a99]">{label}</p>

      <p className="mt-3 text-4xl font-bold text-[#2b1b43]">
        {value ?? "-"}
      </p>
    </div>
  );
}

function FeedbackList({
  title,
  items,
}: {
  title: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-[#2b1b43]">{title}</h3>

      <ul className="mt-3 space-y-3">
        {items.map((item, index) => (
          <li
            key={index}
            className="rounded-xl border border-white/40 bg-white/50 p-4 text-sm leading-6 text-[#5f5470] shadow-sm backdrop-blur-xl"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}