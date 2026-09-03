"use client";
import { useState } from "react";
const stages = [
  {
    title: "Add your content",
    body: "A short behind-the-scenes video from your studio.",
    label: "studio-tour.mp4 · Example video",
  },
  {
    title: "Draft a caption",
    body: "A little look at where the ideas become real. Come behind the scenes with us. #BehindTheScenes #SmallBusiness",
    label: "AI caption · Illustrative example",
  },
  {
    title: "Review the post",
    body: "Check the caption, media and publishing settings. Edit anything before you approve.",
    label: "Assisted mode · Waiting for approval",
  },
  {
    title: "Set a schedule",
    body: "Choose a publishing time after approving your post and connecting TikTok.",
    label: "Example schedule · Nothing is published",
  },
];
export default function WorkflowPreview({headingAs: Heading = "h3"}: {headingAs?: "h2" | "h3"}) {
  const [step, setStep] = useState(0);
  return (
    <div className="oy-workflow">
      <div className="oy-workflow-top">
        <strong>From content to calendar</strong>
        <span>INTERACTIVE EXAMPLE</span>
      </div>
      <div className="oy-workflow-tabs" aria-label="Example workflow steps">
        {stages.map((s, i) => (
          <button
            key={s.title}
            aria-pressed={step === i}
            onClick={() => setStep(i)}
          >
            <span>0{i + 1}</span>
            {["Content", "Caption", "Review", "Schedule"][i]}
          </button>
        ))}
      </div>
      <div className="oy-workflow-body" aria-live="polite">
        <div className="oy-sample-art" aria-hidden="true">
          <span>O.</span>
          <small>YOUR NEXT POST STARTS HERE</small>
        </div>
        <p className="oy-eyebrow">{stages[step].label}</p>
        <Heading>{stages[step].title}</Heading>
        <p>{stages[step].body}</p>
      </div>
      <div className="oy-workflow-footer">
        <span>Sample content. No account connected.</span>
        <button
          className="oy-text-link"
          onClick={() => setStep((step + 1) % 4)}
        >
          {step === 3 ? "Start again" : "Next step"} →
        </button>
      </div>
    </div>
  );
}
