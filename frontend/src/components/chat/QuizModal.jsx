import { useEffect, useMemo, useState } from "react";
import {
  X,
  Shuffle,
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
} from "lucide-react";
import { generateStudySet } from "../../services/api";

export default function QuizModal({ chatId, kind, documents = [], onClose }) {
  const [loading, setLoading] = useState(false);
  const [studySet, setStudySet] = useState(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [source, setSource] = useState("all");
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [topic, setTopic] = useState("");
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [score, setScore] = useState(0);

  const isCards = kind === "flashcards";

  async function loadStudySet() {
    setLoading(true);
    setError("");
    setStudySet(null);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setFlipped(false);
    setScore(0);

    try {
      const data = await generateStudySet(
        chatId,
        kind,
        topic,
        source === "document" ? selectedDocumentId : null
        );

      if (data.error) {
        setError(data.error);
        return;
      }

      setStudySet(data);
    } catch (err) {
      console.error("Failed to generate study set:", err);
      setError("Couldn't generate this study set. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
  if (source === "document" && !selectedDocumentId) {
    setError("Choose a document first.");
    return;
  }

  setError("");
  setSetupComplete(true);
  loadStudySet();
}

  const items = useMemo(() => {
    if (!studySet) return [];
    return isCards ? studySet.cards || [] : studySet.questions || [];
  }, [studySet, isCards]);

  const currentItem = items[currentIndex];

  function chooseAnswer(index) {
    if (showResult) return;

    setSelectedAnswer(index);
    setShowResult(true);

    if (index === currentItem?.answer) {
      setScore((value) => value + 1);
    }
  }

  function nextItem() {
    setSelectedAnswer(null);
    setShowResult(false);
    setFlipped(false);

    if (currentIndex + 1 < items.length) {
      setCurrentIndex((value) => value + 1);
    }
  }

  function previousItem() {
    setSelectedAnswer(null);
    setShowResult(false);
    setFlipped(false);
    setCurrentIndex((value) => Math.max(0, value - 1));
  }

  function shuffleCards() {
    if (!studySet?.cards) return;

    const shuffled = [...studySet.cards];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setStudySet({
      ...studySet,
      cards: shuffled,
    });

    setCurrentIndex(0);
    setFlipped(false);
  }

const completed =
  items.length > 0 &&
  currentIndex === items.length - 1 &&
  (isCards ? flipped : showResult);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-[#151515] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">
              {isCards ? "Flashcards" : "Quiz"}
            </p>
            <h2 className="mt-1 truncate text-base font-medium text-white">
              {studySet?.title || (isCards ? "Study Cards" : "Study Quiz")}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-white/5 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
            {!setupComplete && !loading && (
            <div className="min-h-[360px]">
                <div className="mb-6">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">
                    Setup
                </p>

                <h3 className="mt-2 text-xl font-medium text-white">
                    Create {isCards ? "flashcards" : "a quiz"}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                    Choose what YO should use to build your {isCards ? "cards" : "questions"}.
                </p>
                </div>

                <div>
                <p className="mb-3 text-xs text-gray-500">Source</p>

                <div className="space-y-2">
                    <button
                    type="button"
                    onClick={() => {
                        setSource("all");
                        setSelectedDocumentId(null);
                        setError("");
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                        source === "all"
                        ? "border-white/25 bg-white/10 text-white"
                        : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                    }`}
                    >
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            source === "all"
                                ? "border-white/40 bg-white text-black"
                                : "border-white/10 text-transparent"
                            }`}
                        >
                            <Check size={12} />
                        </div>

                        <div className="min-w-0">
                            <p className="text-sm">Entire chat</p>
                            <p className="mt-1 text-xs text-gray-600">
                            Use all available study material
                            </p>
                        </div>
                        </div>
                    </button>

                    {documents.map((document) => (
                    <button
                        key={document.id}
                        type="button"
                        onClick={() => {
                        setSource("document");
                        setSelectedDocumentId(document.id);
                        setError("");
                        }}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                        source === "document" &&
                        selectedDocumentId === document.id
                            ? "border-white/25 bg-white/10 text-white"
                            : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                        }`}
                    >
                        <div className="flex items-center gap-3">
                        <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            source === "document" && selectedDocumentId === document.id
                                ? "border-white/40 bg-white text-black"
                                : "border-white/10 text-transparent"
                            }`}
                        >
                            <Check size={12} />
                        </div>

                        <div className="min-w-0">
                            <p className="truncate text-sm">{document.filename}</p>
                            <p className="mt-1 text-xs text-gray-600">
                            Use this document only
                            </p>
                        </div>
                        </div>
                    </button>
                    ))}
                </div>
                </div>

                <div className="mt-6">
                <label className="mb-3 block text-xs text-gray-500">
                    Topic <span className="text-gray-700">(optional)</span>
                </label>

                <input
                    type="text"
                    value={topic}
                    onChange={(e) => {
                    setTopic(e.target.value);
                    setError("");
                    }}
                    placeholder="e.g. Photosynthesis"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-white/20"
                />
                </div>

                {error && (
                <p className="mt-4 text-sm text-gray-400">
                    {error}
                </p>
                )}

                <button
                type="button"
                onClick={handleGenerate}
                className="mt-6 w-full rounded-xl bg-white py-3 text-sm font-medium text-black transition-colors hover:bg-gray-200"
                >
                {source === "document" && selectedDocumentId
                    ? `Generate ${isCards ? "flashcards" : "quiz"} from ${
                        documents.find((doc) => doc.id === selectedDocumentId)?.filename || "document"
                        }`
                    : `Generate ${isCards ? "flashcards" : "quiz"}`}
                </button>
            </div>
            )}
          {loading && (
            <div className="flex min-h-[360px] flex-col items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white/70" />
              <p className="mt-4 text-sm text-gray-500">
                Building your {isCards ? "cards" : "quiz"}...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <p className="max-w-sm text-sm leading-relaxed text-gray-400">
                {error}
              </p>

              <button
                onClick={loadStudySet}
                className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:border-white/20 hover:text-white transition-colors"
              >
                <RotateCcw size={14} />
                Try again
              </button>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <>
                {!completed && (
                    <div className="mb-6">
                        <div className="mb-3 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-gray-600">
                            Progress
                            </p>
                            <p className="mt-1 text-sm text-gray-400">
                            {currentIndex + 1}
                            <span className="mx-1.5 text-gray-700">/</span>
                            {items.length}
                            </p>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-gray-600">
                            {!isCards && (
                                <span
                                    className={
                                    (score / items.length) * 100 < 50
                                        ? "text-red-400"
                                        : "text-green-400"
                                    }
                                >
                                    {Math.round((score / items.length) * 100)}%
                                </span>
                                )}

                            {isCards && (
                            <button
                                onClick={shuffleCards}
                                className="flex items-center gap-1.5 hover:text-white transition-colors"
                            >
                                <Shuffle size={13} />
                                shuffle
                            </button>
                            )}

                            <button
                            onClick={() => {
                                setStudySet(null);
                                setSetupComplete(false);
                                setError("");
                            }}
                            className="hover:text-white transition-colors"
                            >
                            change setup
                            </button>
                        </div>
                        </div>

                        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                            className="h-full rounded-full bg-white/50 transition-all duration-500"
                            style={{
                            width: `${((currentIndex + 1) / items.length) * 100}%`,
                            }}
                        />
                        </div>
                    </div>
                    )}

              {isCards && !completed && (
                <>
                  <div
                    className="flip-scene mb-3"
                    onClick={() => setFlipped((value) => !value)}
                  >
                    <div
                      className={`flip-card relative h-56 w-full cursor-pointer ${
                        flipped ? "flipped" : ""
                      }`}
                    >
                      <div className="flip-face absolute inset-0 flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
                        <p className="text-[15px] leading-relaxed text-white">
                          {currentItem?.front}
                        </p>
                      </div>

                      <div className="flip-face flip-back absolute inset-0 flex items-center justify-center rounded-2xl bg-white p-6 text-center text-black">
                        <p className="text-[14px] leading-relaxed">
                          {currentItem?.back}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mb-4 text-center text-[11px] text-gray-600">
                    tap card to flip
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={previousItem}
                      disabled={currentIndex === 0}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-gray-400 hover:border-white/20 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ArrowLeft size={15} />
                    </button>

                    <button
                      onClick={() => setFlipped((value) => !value)}
                      className="flex-1 rounded-xl border border-white/10 text-sm text-gray-300 hover:border-white/20 hover:text-white transition-colors"
                    >
                      {flipped ? "hide answer" : "show answer"}
                    </button>

                    <button
                        onClick={() => {
                            if (currentIndex + 1 >= items.length) {
                            setFlipped(true);
                            return;
                            }

                            nextItem();
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-gray-400 hover:border-white/20 hover:text-white transition-colors"
                        >
                        {currentIndex + 1 >= items.length ? (
                            <Check size={15} />
                        ) : (
                            <ArrowRight size={15} />
                        )}
                        </button>
                  </div>
                </>
              )}

              {!isCards && !completed && (
                <>
                  <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-[15px] leading-relaxed text-white">
                      {currentItem?.q}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {currentItem?.options?.map((option, index) => {
                      const selected = selectedAnswer === index;
                      const correct = currentItem.answer === index;

                      let classes =
                        "w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ";

                      if (!showResult) {
                        classes +=
                            "border-white/10 text-gray-300 hover:border-white/25 hover:text-white";
                        } else if (correct) {
                        classes +=
                            "border-green-400/30 bg-green-400/10 text-green-400";
                        } else if (selected) {
                        classes +=
                            "border-red-400/30 bg-red-400/10 text-red-400";
                        } else {
                        classes +=
                            "border-white/5 text-gray-600";
                        }

                      return (
                        <button
                          key={`${currentIndex}-${index}`}
                          onClick={() => chooseAnswer(index)}
                          disabled={showResult}
                          className={classes}
                        >
                          <span className="mr-3 text-gray-600">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {showResult && (
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div
                        className={`flex items-center gap-2 text-sm ${
                            selectedAnswer === currentItem.answer
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                        >
                        {selectedAnswer === currentItem.answer ? (
                            <Check size={15} />
                        ) : (
                            <X size={15} />
                        )}

                        {selectedAnswer === currentItem.answer
                            ? "Correct"
                            : "Incorrect"}
                        </div>

                      {currentItem.explanation && (
                        <p className="mt-2 text-[13px] leading-relaxed text-gray-400">
                          {currentItem.explanation}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={previousItem}
                      disabled={currentIndex === 0}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-gray-400 hover:border-white/20 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ArrowLeft size={15} />
                    </button>

                    <button
                      onClick={nextItem}
                      disabled={!showResult}
                      className="flex-1 rounded-xl border border-white/10 text-sm text-gray-300 hover:border-white/20 hover:text-white disabled:opacity-30 transition-colors"
                    >
                      {currentIndex + 1 < items.length ? "Next question" : "Finish"}
                    </button>
                  </div>
                </>
              )}

              {completed && (
                <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                    <Check size={24} className="text-white" />
                    </div>

                    {isCards ? (
                    <>
                        <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-gray-500">
                        Flashcards complete
                        </p>

                        <p className="mt-2 text-3xl font-medium text-white">
                        All done
                        </p>

                        <p className="mt-2 text-sm text-gray-500">
                        You went through all {items.length} cards.
                        </p>
                    </>
                    ) : (
                    <>
                        <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-gray-500">
                        Quiz complete
                        </p>

                        <p className="mt-2 text-3xl font-medium text-white">
                        {score} / {items.length}
                        </p>

                        <p
                            className={
                                (score / items.length) * 100 < 50
                                ? "mt-2 text-sm text-red-400"
                                : "mt-2 text-sm text-green-400"
                            }
                            >
                            {Math.round((score / items.length) * 100)}% correct
                            </p>
                    </>
                    )}

                    <div className="mt-6 flex gap-2">
                    <button
                        onClick={() => {
                        setStudySet(null);
                        setSetupComplete(false);
                        setError("");
                        }}
                        className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:border-white/20 hover:text-white transition-colors"
                    >
                        <RotateCcw size={14} />
                        New {isCards ? "cards" : "quiz"}
                    </button>

                    <button
                        onClick={onClose}
                        className="rounded-xl bg-white px-4 py-2.5 text-sm text-black hover:bg-gray-200 transition-colors"
                    >
                        Done
                    </button>
                    </div>
                </div>
                )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .flip-scene {
          perspective: 1200px;
        }

        .flip-card {
          transform-style: preserve-3d;
          transition: transform 0.5s cubic-bezier(.4,.2,.2,1);
        }

        .flip-card.flipped {
          transform: rotateY(180deg);
        }

        .flip-face {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .flip-back {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}