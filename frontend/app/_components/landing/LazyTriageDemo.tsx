"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

/**
 * AG Grid is ~330 KB gzipped. Load the triage demo only when it approaches the
 * viewport, so it never blocks first paint.
 */
const TriageDemo = dynamic(() => import("./TriageDemo"), { ssr: false, loading: () => <Placeholder /> });

function Placeholder() {
  return (
    <section id="triage" aria-busy="true" className="bg-marshmallow py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="mx-auto h-[220px] max-w-3xl" />
        <div className="mt-12 h-[620px] rounded-[20px] bg-white/70 lg:mt-16" />
      </div>
    </section>
  );
}

export default function LazyTriageDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  // AG Grid's first render is a ~170 ms task. Do it in idle time after load
  // (while the visitor is reading the hero) rather than mid-scroll. The
  // IntersectionObserver below is the fallback for fast scrollers.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
    const mount = () => import("./TriageDemo").then(() => setShow(true));
    if (w.requestIdleCallback) {
      const h = w.requestIdleCallback(mount, { timeout: 4000 });
      return () => w.cancelIdleCallback?.(h);
    }
    const t = window.setTimeout(mount, 2500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    // Jumping to #triage lands on the placeholder (same id), which is then in view.
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <div ref={ref}>{show ? <TriageDemo /> : <Placeholder />}</div>;
}
