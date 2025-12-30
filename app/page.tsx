"use client";

import { useState, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';
import { Youtube, Search, Loader2, Sparkles, Layout, Zap, ClipboardCheck, Share2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    // Load persisted data - Safe to use localStorage here in useEffect
    const savedUrl = localStorage.getItem('yt_summarizer_url');
    const savedResult = localStorage.getItem('yt_summarizer_result');
    const savedTitle = localStorage.getItem('yt_summarizer_title');

    if (savedUrl) setUrl(savedUrl);
    if (savedResult) setResult(savedResult);
    if (savedTitle) setTitle(savedTitle);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSummarize = async () => {
    const videoId = getYouTubeID(url);
    if (!videoId) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Updated API Endpoint for Vercel Function
      const response = await fetch(`/api/transcript?videoId=${videoId}&summarize=true`);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server returned ${response.status}: ${text.substring(0, 100)}`);
      }

      const data = await response.json();

      if (data.success) {
        const summaryContent = data.summary || "No summary generated.";
        const videoTitle = data.title || "Unknown Video";

        setResult(summaryContent);
        setTitle(videoTitle);

        // Persist data
        localStorage.setItem('yt_summarizer_url', url);
        localStorage.setItem('yt_summarizer_result', summaryContent);
        localStorage.setItem('yt_summarizer_title', videoTitle);
      } else {
        throw new Error(data.error || 'Failed to fetch with unknown API error');
      }
    } catch (error: any) {
      console.error('Full Error:', error);
      alert(`Error fetching transcript: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      alert('Copied to clipboard! Ready for Obsidian.');
    }
  };

  const parseFrontmatter = (text: string) => {
    const match = text.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
    if (!match) return { properties: {}, body: text };

    const yamlBlock = match[1];
    const bodyContent = match[2];
    const properties: Record<string, any> = {};

    yamlBlock.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length) {
        let value: any = valueParts.join(':').trim();
        // Basic YAML list/array parsing for UI display
        if (value.startsWith('[') && value.endsWith(']')) {
          try {
            value = JSON.parse(value.replace(/'/g, '"'));
          } catch (e) {
            value = value.slice(1, -1).split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, ''));
          }
        } else {
          value = value.replace(/^["']|["']$/g, '');
        }
        properties[key.trim()] = value;
      }
    });

    return { properties, body: bodyContent };
  };

  const ObsidianProperties = ({ properties }: { properties: Record<string, any> }) => {
    if (Object.keys(properties).length === 0) return null;

    const renderValue = (val: any) => {
      if (Array.isArray(val)) {
        return val.map((item: any, i: number) => (
          <span key={i} className="prop-pill">{item}</span>
        ));
      }
      if (typeof val === 'string' && val.includes('[[')) {
        return <span className="prop-link">{val}</span>;
      }
      return <span>{String(val)}</span>;
    };

    const getIcon = (key: string) => {
      if (key === 'tags' || key === 'categories') return <Sparkles className="w-3 h-3" />;
      if (key === 'url') return <Youtube className="w-3 h-3" />;
      return <Layout className="w-3 h-3" />;
    };

    return (
      <div className="obsidian-properties">
        <div className="properties-header">
          <Layout className="w-3 h-3" />
          Properties
        </div>
        {Object.entries(properties).map(([key, value]) => (
          <div key={key} className="property-row">
            <div className="property-key">
              {getIcon(key)}
              {key}
            </div>
            <div className="property-value">
              {renderValue(value)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const { properties, body } = result ? parseFrontmatter(result) : { properties: {}, body: "" };
  const playerRef = useRef<any>(null);

  const handleTimestampClick = (timeStr: string) => {
    // Parse time like "1:15:30", "1:15" or "0:00" to seconds
    const parts = timeStr.trim().split(':').map(Number);
    let seconds = 0;

    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else {
      seconds = parts[0];
    }

    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      playerRef.current.playVideo();
    }
  };

  return (
    <div className="min-h-screen pb-20 font-sans selection:bg-accent-secondary selection:text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 px-6 md:px-12 py-6 flex justify-between items-center ${isScrolled ? 'glass py-4' : 'bg-transparent'}`}>
        <div className="flex items-center gap-3">
          <div className="bg-accent-primary rounded-xl p-1.5 flex items-center justify-center shadow-md">
            <Youtube className="w-6 h-6 text-paper" />
          </div>
          <span className="font-bold text-xl tracking-tight text-text-main">WATCHLESS</span>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-32 md:pt-48 flex flex-col items-center text-center">
        <div className="relative mb-6">
          <div className="inline-flex items-center gap-2 bg-accent-primary/10 text-accent-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border border-accent-primary/20 mb-8 shadow-sm">
            <Sparkles className="w-3 h-3" /> VINTAGE EDITION
          </div>
          <h1 className="title-large mb-8 text-accent-primary drop-shadow-sm">
            Distilled Wisdom <br />
            <span className="bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent italic font-serif">On Paper</span>
          </h1>
          <p className="text-lg md:text-xl text-text-dim max-w-2xl mx-auto mb-12 leading-relaxed font-serif italic">
            Transforming digital noise into elegant, readable summaries. Experience the clarity of thought with a touch of nostalgia.
          </p>
        </div>

        {/* Input Controller */}
        <div className="w-full max-w-3xl glass rounded-3xl p-2 md:p-3 flex flex-col md:flex-row gap-2 items-stretch mt-8 mb-20 bg-white/60 border-accent-primary/10">
          <div className="relative flex-grow">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-primary/50" />
            <input
              type="text"
              placeholder="Paste YouTube video link here..."
              className="w-full bg-transparent py-5 pl-16 pr-8 text-text-main outline-none placeholder:text-text-dim/50 text-lg font-serif italic"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSummarize()}
            />
          </div>
          <button
            onClick={handleSummarize}
            disabled={loading || !url}
            className="flex items-center justify-center gap-3 bg-accent-primary text-paper rounded-2xl py-4 px-8 font-bold text-lg hover:bg-accent-secondary hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px] shadow-md border-b-4 border-accent-primary/50 active:border-b-0 active:translate-y-1"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Zap className="w-5 h-5 fill-current" />
                Summarize Now
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="w-full max-w-5xl animate-in slide-in-from-bottom-12 duration-1000">
            <div className="w-full">
              {/* Main Summary Card */}
              <div className="glass p-8 md:p-12 rounded-[2.5rem] text-left relative overflow-hidden group bg-paper border-accent-primary/10 shadow-xl">

                {/* Header / Title Section */}
                <div className="mb-6 border-b border-accent-primary/10 pb-6">
                  <h1 className="text-3xl md:text-4xl font-bold text-text-main mb-3 leading-tight tracking-tight">
                    {title}
                  </h1>
                  <div className="flex items-center gap-6 text-sm mt-3 opacity-70">
                    <div className="flex items-center gap-2">
                      <Layout className="w-4 h-4" /> Obsidian Ready
                    </div>
                    <div className="h-4 w-px bg-current opacity-20"></div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> AI Generated
                    </div>
                  </div>
                </div>

                {/* Properties Section */}
                <ObsidianProperties properties={properties} />

                <div className="obsidian-prose prose prose-invert prose-slate max-w-none text-text-main">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: () => null,
                      iframe: ({ node, ...props }: any) => {
                        if (props.src && props.src.includes('youtube.com/embed')) {
                          const videoId = props.src.split('/').pop()?.split('?')[0];
                          return (
                            <div className="w-full rounded-2xl overflow-hidden shadow-lg mb-10 aspect-video border border-pine/10">
                              <YouTube
                                videoId={videoId}
                                className="w-full h-full"
                                iframeClassName="w-full h-full"
                                onReady={(event: any) => {
                                  playerRef.current = event.target;
                                }}
                                opts={{
                                  width: '100%',
                                  height: '100%',
                                  playerVars: { autoplay: 0 },
                                }}
                              />
                            </div>
                          );
                        }
                        return <iframe {...props} />;
                      },
                      a: ({ children, href, ...props }: any) => {
                        const getText = (child: any): string => {
                          if (typeof child === 'string') return child;
                          if (Array.isArray(child)) return child.map(getText).join('');
                          if (child?.props?.children) return getText(child.props.children);
                          return '';
                        };

                        const textContent = getText(children).trim();
                        const isTimestamp = /^(\d{1,2}:\d{2}(:\d{2})?)$/.test(textContent);

                        if (isTimestamp && href) {
                          return (
                            <a
                              {...props}
                              href={href}
                              onClick={(e) => {
                                e.preventDefault();
                                handleTimestampClick(textContent);
                              }}
                              className="timestamp-link text-accent-secondary font-bold cursor-pointer hover:underline"
                            >
                              {children}
                            </a>
                          )
                        }
                        return <a href={href} {...props} className="text-sunrise no-underline hover:underline transition-all font-medium">{children}</a>
                      },
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-8 border border-pine/10 rounded-xl bg-white/30">
                          <table className="w-full text-left text-sm">{children}</table>
                        </div>
                      ),
                      p: ({ children }) => {
                        if (typeof children === 'string' && children.includes('[[')) {
                          const parts = children.split(/(\[\[.*?\]\])/g);
                          return <p className="mb-4 leading-normal">{parts.map((part, i) => part.startsWith('[[') ? <span key={i} className="text-accent-secondary font-medium cursor-pointer border-b border-dashed border-accent-secondary/50 hover:border-solid transition-all">{part}</span> : part)}</p>;
                        }
                        return <p className="mb-4 leading-normal">{children}</p>;
                      }
                    }}
                  >
                    {body}
                  </ReactMarkdown>
                </div>

                <div className="flex flex-wrap gap-4 mt-12 border-t border-accent-primary/10 pt-8">
                  <button
                    onClick={copyToClipboard}
                    className="py-3 px-8 bg-accent-primary text-paper rounded-full font-bold flex items-center gap-2 hover:bg-accent-secondary hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    <ClipboardCheck className="w-5 h-5" /> Copy for Obsidian
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for no results */}
        {!result && !loading && (
          <div className="opacity-40 flex flex-col items-center gap-4 py-20 animate-pulse text-accent-primary">
            <Youtube className="w-24 h-24 stroke-[1px]" />
            <p className="font-bold tracking-[0.5em] uppercase text-xs">Ready for input</p>
          </div>
        )}
      </main>

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent-primary/30 to-transparent"></div>
    </div>
  );
}
