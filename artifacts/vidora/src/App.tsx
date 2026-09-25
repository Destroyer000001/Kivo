import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Bookmark, Check, ChevronLeft, ChevronRight, Clapperboard, Compass, FileVideo, Heart, Home, Menu, MessageCircle, MoreHorizontal, Play, Plus, Search, Send, Settings, Share2, Sparkles, Upload, UserRound, Users, Volume2, VolumeX, X } from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const LOCAL_METADATA_KEY = 'kivo-local-videos-v1';
const LOCAL_ACTIONS_KEY = 'kivo-actions-v1';
const LOCAL_MEDIA_DB = 'kivo-local-media-v1';
const LOCAL_MEDIA_STORE = 'files';

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in the environment.');
}

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#d8ff4f',
    colorForeground: '#f5f5f5',
    colorMutedForeground: '#9d9da7',
    colorDanger: '#f05f5f',
    colorBackground: '#171719',
    colorInput: '#0b0b0d',
    colorInputForeground: '#f5f5f5',
    colorNeutral: '#2d2d31',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#171719] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#f5f5f5] font-mono',
    headerSubtitle: 'text-[#9d9da7]',
    socialButtonsBlockButtonText: 'text-[#f5f5f5]',
    formFieldLabel: 'text-[#f5f5f5]',
    footerActionLink: 'text-[#d8ff4f]',
    footerActionText: 'text-[#9d9da7]',
    dividerText: 'text-[#9d9da7]',
    identityPreviewEditButton: 'text-[#d8ff4f]',
    formFieldSuccessText: 'text-[#d8ff4f]',
    alertText: 'text-[#f5f5f5]',
    logoBox: 'h-10',
    logoImage: 'max-h-10',
    socialButtonsBlockButton: 'border-[#2d2d31] bg-[#0b0b0d] hover:bg-[#202024]',
    formButtonPrimary: 'bg-[#d8ff4f] text-[#0b0b0d] hover:bg-[#c8ef43]',
    formFieldInput: 'border-[#2d2d31] bg-[#0b0b0d] text-[#f5f5f5]',
    footerAction: 'border-t border-[#2d2d31]',
    dividerLine: 'bg-[#2d2d31]',
    alert: 'border-[#2d2d31] bg-[#202024]',
    otpCodeFieldInput: 'border-[#2d2d31] bg-[#0b0b0d] text-[#f5f5f5]',
    formFieldRow: 'text-[#f5f5f5]',
    main: 'bg-[#171719]',
  },
};

type VideoKind = 'Video' | 'Short';

type Video = {
  id: string;
  title: string;
  creator: string;
  initials: string;
  duration: string;
  views: string;
  posted: string;
  color: string;
  category: string;
  description: string;
  kind: VideoKind;
  sourceUrl?: string;
  thumbnail?: string;
  mediaId?: string;
  isLocal?: boolean;
};

type UploadDraft = {
  file: File;
  title: string;
  description: string;
  category: string;
  kind: VideoKind;
  duration: string;
  thumbnail?: string;
};

const categories = ['For you', 'Following', 'Travel', 'Create', 'Food', 'Music'];

function readStoredIds() {
  try {
    const value = localStorage.getItem(LOCAL_ACTIONS_KEY);
    const parsed = value ? JSON.parse(value) as { liked?: string[]; saved?: string[] } : {};
    return { liked: parsed.liked ?? [], saved: parsed.saved ?? [] };
  } catch {
    return { liked: [], saved: [] };
  }
}

function openMediaDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(LOCAL_MEDIA_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(LOCAL_MEDIA_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open local media storage'));
  });
}

async function saveMediaBlob(id: string, blob: Blob) {
  const database = await openMediaDb();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(LOCAL_MEDIA_STORE, 'readwrite').objectStore(LOCAL_MEDIA_STORE).put(blob, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Unable to save local media'));
  });
  database.close();
}

async function readMediaBlob(id: string) {
  const database = await openMediaDb();
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(LOCAL_MEDIA_STORE, 'readonly').objectStore(LOCAL_MEDIA_STORE).get(id);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error ?? new Error('Unable to read local media'));
  });
  database.close();
  return blob;
}

function serializableVideo(video: Video) {
  const { sourceUrl, ...metadata } = video;
  return metadata;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return '00:00';
  const wholeSeconds = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(wholeSeconds / 60)).padStart(2, '0')}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

async function shareVideo(video: Video) {
  const shareData = { title: video.title, text: `${video.title} on KIVO` };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(video.title);
    }
  } catch {
    // Sharing can be dismissed by the user; the prototype does not need an error state.
  }
}

function Avatar({ initials, small = false }: { initials: string; small?: boolean }) {
  return <span data-testid={`avatar-${initials}`} className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#d8ff4f] font-bold text-[#0b0b0d] ${small ? 'size-8 text-[10px]' : 'size-10 text-xs'}`}>{initials}</span>;
}

function Logo() {
  return <Link href="/" data-testid="link-logo" className="flex items-center gap-2 text-foreground">
    <span className="relative flex size-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground shadow-[0_0_22px_hsl(var(--primary)/.28)]"><Clapperboard className="size-[17px]" /></span>
    <span className="font-mono text-[21px] font-bold tracking-[-.08em]">kivo</span>
  </Link>;
}

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return <Link href={href} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`} className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
    <Icon className={`size-[19px] ${active ? 'stroke-[2.4]' : ''}`} /><span>{label}</span>
  </Link>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const nav = [{ href: '/', label: 'Home', icon: Home }, { href: '/shorts', label: 'Shorts', icon: Play }, { href: '/search', label: 'Discover', icon: Compass }, { href: '/profile', label: 'Profile', icon: UserRound }];
  return <div className="kivo-shell min-h-[100dvh]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col border-r border-border bg-card/75 px-5 py-6 backdrop-blur-xl md:flex">
      <Logo />
      <nav className="mt-12 space-y-1">{nav.map(item => <NavItem key={item.href} {...item} active={location === item.href} />)}</nav>
      <div className="mt-auto rounded-2xl bg-secondary/55 p-4">
        <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-card text-primary"><Sparkles className="size-4" /></div>
        <p className="text-sm font-bold">Share your point of view</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">A good story is worth making room for.</p>
        <Link href="/upload" data-testid="link-sidebar-upload" className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-xl bg-foreground px-3 text-xs font-bold text-background transition-transform hover:-translate-y-0.5"><Plus className="size-4" />Upload a video</Link>
      </div>
      <Link href="/profile" data-testid="link-sidebar-settings" className="mt-5 flex items-center gap-3 rounded-xl px-2 py-2 text-xs text-muted-foreground hover:text-foreground"><Settings className="size-4" />Preferences</Link>
    </aside>
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/70 bg-background/85 px-5 backdrop-blur-xl md:hidden">
      <button type="button" data-testid="button-mobile-menu" aria-label="Open menu" onClick={() => setMobileNav(true)} className="flex size-10 items-center justify-center rounded-xl bg-card text-muted-foreground"><Menu className="size-5" /></button>
      <Logo />
      <Link href="/upload" data-testid="link-mobile-upload" className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Upload className="size-[18px]" /></Link>
    </header>
    {mobileNav && <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden" onClick={() => setMobileNav(false)}>
      <div className="h-full w-[78%] max-w-[290px] bg-card p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between"><Logo /><button type="button" data-testid="button-close-menu" onClick={() => setMobileNav(false)} className="flex size-10 items-center justify-center rounded-xl bg-muted"><X className="size-5" /></button></div>
        <nav className="mt-12 space-y-1">{nav.map(item => <NavItem key={item.href} {...item} active={location === item.href} />)}</nav>
        <Link href="/upload" data-testid="link-menu-upload" onClick={() => setMobileNav(false)} className="mt-8 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground"><Plus className="size-4" />Upload a video</Link>
      </div>
    </div>}
    <main className="mx-auto min-h-[calc(100dvh-68px)] max-w-[1380px] px-5 pb-24 md:ml-[220px] md:px-10 md:pb-12 lg:px-14">{children}</main>
    <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[74px] items-center justify-around border-t border-border/80 bg-card/90 px-3 backdrop-blur-xl md:hidden">{nav.map(item => <Link key={item.href} href={item.href} data-testid={`link-mobile-nav-${item.label.toLowerCase()}`} className={`flex min-w-16 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold ${location === item.href ? 'text-primary' : 'text-muted-foreground'}`}><item.icon className="size-[19px]" /><span>{item.label}</span></Link>)}</nav>
  </div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: ReactNode; description?: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between md:py-12"><div>{eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</p>}<h1 className="font-mono text-3xl font-bold tracking-[-.05em] md:text-5xl">{title}</h1>{description && <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">{description}</p>}</div>{action}</div>;
}

function VideoThumb({ video, large = false }: { video: Video; large?: boolean }) {
  return <div className={`video-art relative overflow-hidden ${large ? 'aspect-[16/9]' : 'aspect-video'} rounded-[18px]`} style={{ background: video.color }}>
    {video.thumbnail && <img src={video.thumbnail} alt="" className="absolute inset-0 size-full object-cover" />}
    {video.sourceUrl && <video autoPlay muted loop playsInline preload="metadata" src={video.sourceUrl} poster={video.thumbnail} className="absolute inset-0 size-full object-cover" />}
    <div className="absolute inset-0 flex items-center justify-center"><span className={`flex items-center justify-center rounded-full border border-white/40 bg-[#1d2c35]/35 text-white backdrop-blur-md ${large ? 'size-14' : 'size-11'}`}><Play className="ml-1 size-5 fill-current" /></span></div>
    <span className="absolute bottom-3 right-3 rounded-md bg-foreground/75 px-2 py-1 font-mono text-[10px] font-bold text-background">{video.duration}</span>
    <span className="absolute left-3 top-3 rounded-md bg-background/75 px-2 py-1 text-[10px] font-bold text-foreground backdrop-blur-md">{video.kind === 'Short' ? 'Short' : video.category}</span>
  </div>;
}

function VideoCard({ video, liked, saved, onLike, onSave, onShare, compact = false }: { video: Video; liked: boolean; saved: boolean; onLike: () => void; onSave: () => void; onShare: () => void; compact?: boolean }) {
  return <article data-testid={`card-video-${video.id}`} className={`group ${compact ? '' : 'rounded-2xl bg-card p-2 shadow-[0_5px_24px_hsl(0_0%_0%/.22)]'}`}>
    <Link href={`/watch/${video.id}`} data-testid={`link-video-${video.id}`} className="block"><VideoThumb video={video} /></Link>
    <div className={`${compact ? 'pt-3' : 'px-1 pb-1 pt-3'}`}>
      <div className="flex gap-3"><Avatar initials={video.initials} small /><div className="min-w-0 flex-1"><Link href={`/watch/${video.id}`} data-testid={`link-title-${video.id}`} className="block truncate text-[15px] font-bold leading-5 group-hover:text-primary">{video.title}</Link><p className="mt-1 text-xs text-muted-foreground">{video.creator} · {video.views} views · {video.posted}</p></div><button type="button" data-testid={`button-more-${video.id}`} aria-label={`More options for ${video.title}`} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><MoreHorizontal className="size-4" /></button></div>
      <div className="mt-3 flex gap-2 border-t border-border/70 pt-2"><button type="button" data-testid={`button-like-${video.id}`} onClick={onLike} className={`flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors ${liked ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}><Heart className={`size-4 ${liked ? 'fill-current' : ''}`} />{liked ? 'Liked' : 'Like'}</button><button type="button" data-testid={`button-save-${video.id}`} onClick={onSave} className={`flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors ${saved ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'}`}><Bookmark className={`size-4 ${saved ? 'fill-current' : ''}`} />{saved ? 'Saved' : 'Save'}</button><button type="button" data-testid={`button-share-${video.id}`} onClick={onShare} className="ml-auto flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Share video"><Share2 className="size-4" /></button></div>
    </div>
  </article>;
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div data-testid="empty-state" className="flex min-h-[290px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 text-center"><span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Search className="size-5" /></span><h2 className="mt-4 font-mono text-xl font-bold tracking-[-.04em]">{title}</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

type ActionProps = {
  liked: string[];
  saved: string[];
  toggleLike: (id: string) => void;
  toggleSave: (id: string) => void;
  share: (video: Video) => void;
};

function HomePage({ videos, actions }: { videos: Video[]; actions: ActionProps }) {
  const [activeCategory, setActiveCategory] = useState('For you');
  const visible = activeCategory === 'For you' || activeCategory === 'Following' ? videos : videos.filter(video => video.category === activeCategory);
  const featured = visible[0];
  return <Shell><PageHeading eyebrow="A little something to watch" title={<>Find your next <span className="text-primary">favorite.</span></>} description="A friendly corner for thoughtful videos, curious makers, and the occasional rabbit hole." action={<Link href="/upload" data-testid="link-home-upload" className="hidden min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 sm:flex"><Upload className="size-4" />Share a video</Link>} />
    <div className="hide-scrollbar -mx-1 mb-8 flex gap-2 overflow-x-auto px-1 pb-1">{categories.map(category => <button type="button" key={category} data-testid={`button-category-${category.toLowerCase().replace(' ', '-')}`} onClick={() => setActiveCategory(category)} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold transition-colors ${activeCategory === category ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:bg-muted'}`}>{category}</button>)}</div>
     {featured ? <><div className="grid gap-5 lg:grid-cols-[1.28fr_.72fr]"><div className="rounded-2xl bg-card p-2 shadow-[0_7px_32px_hsl(0_0%_0%/.28)]"><Link href={`/watch/${featured.id}`} data-testid={`link-featured-${featured.id}`} className="block"><VideoThumb video={featured} large /></Link><div className="p-3 md:p-4"><p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-primary">{featured.isLocal ? 'Your latest upload' : 'Picked for you'}</p><Link href={`/watch/${featured.id}`} className="block"><h2 className="font-mono text-2xl font-bold tracking-[-.05em] hover:text-primary md:text-3xl">{featured.title}</h2></Link><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{featured.description}</p><div className="mt-4 flex items-center gap-3"><Avatar initials={featured.initials} small /><div className="text-xs"><p className="font-bold">{featured.creator}</p><p className="text-muted-foreground">{featured.views} views · {featured.posted}</p></div><button type="button" data-testid={`button-featured-like-${featured.id}`} onClick={() => actions.toggleLike(featured.id)} className={`ml-auto flex size-10 items-center justify-center rounded-xl ${actions.liked.includes(featured.id) ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}><Heart className={`size-[18px] ${actions.liked.includes(featured.id) ? 'fill-current' : ''}`} /></button></div></div></div><div className="hidden rounded-2xl bg-secondary/55 p-6 lg:flex lg:flex-col lg:justify-between"><div><div className="mb-8 flex size-11 items-center justify-center rounded-2xl bg-card text-primary"><Sparkles className="size-5" /></div><p className="text-xs font-bold uppercase tracking-[.18em] text-secondary-foreground/65">Today on KIVO</p><h2 className="mt-3 max-w-xs font-mono text-3xl font-bold leading-[1.06] tracking-[-.06em] text-secondary-foreground">Slow down. Stay curious.</h2></div><div><p className="max-w-xs text-sm leading-6 text-secondary-foreground/75">Discover people making things because they care, not because they have to.</p><Link href="/shorts" data-testid="link-home-shorts" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-secondary-foreground px-4 text-xs font-bold text-secondary">Browse Shorts <ChevronRight className="size-4" /></Link></div></div></div><section className="mt-10"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Keep exploring</p><h2 className="mt-1 font-mono text-2xl font-bold tracking-[-.05em]">Fresh from the community</h2></div><span className="text-xs text-muted-foreground">{visible.length} videos</span></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{visible.slice(1).map(video => <VideoCard key={video.id} video={video} liked={actions.liked.includes(video.id)} saved={actions.saved.includes(video.id)} onLike={() => actions.toggleLike(video.id)} onSave={() => actions.toggleSave(video.id)} onShare={() => actions.share(video)} />)}</div></section></> : <EmptyState title="No videos yet" description="Your feed is ready for real uploads. Add a video to start building your KIVO shelf." action={<Link href="/upload" data-testid="button-home-upload-empty" className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Upload a video</Link>} />}</Shell>;
}

function ShortsPage({ videos, actions }: { videos: Video[]; actions: ActionProps }) {
  const shorts = useMemo(() => videos.filter(video => video.kind === 'Short'), [videos]);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [notice, setNotice] = useState('');
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState('');
  const touchStart = useRef<number | null>(null);
  const current = shorts.length ? shorts[index % shorts.length] : undefined;
  const go = (direction: number) => setIndex(value => (value + direction + shorts.length) % shorts.length);
  const showNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 1800); };
  if (!current) return <Shell><PageHeading eyebrow="Quick watch" title="Shorts" description="Short videos from your local KIVO session will appear here." /><EmptyState title="No Shorts yet" description="Choose Short while uploading a video to start your vertical shelf." action={<Link href="/upload" className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Upload a Short</Link>} /></Shell>;
  const like = () => { actions.toggleLike(current.id); showNotice(actions.liked.includes(current.id) ? 'Removed from your likes' : 'Added to your likes'); };
  const sendComment = (event: FormEvent) => { event.preventDefault(); if (!comment.trim()) return; setComment(''); setCommentOpen(false); showNotice('Comment added to this demo'); };
  return <Shell><div className="mx-auto max-w-[1050px] py-6 md:py-10"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Quick watch</p><h1 className="mt-1 font-mono text-3xl font-bold tracking-[-.05em]">Shorts</h1></div><div className="rounded-full bg-card px-3 py-2 text-xs font-bold text-muted-foreground">{index + 1} / {shorts.length}</div></div><div className="grid gap-5 lg:grid-cols-[minmax(280px,530px)_1fr] lg:items-center"><div className="relative mx-auto aspect-[9/15] w-full max-w-[430px] overflow-hidden rounded-[28px] bg-foreground shadow-2xl shadow-foreground/15" style={{ background: current.color }} onTouchStart={event => { touchStart.current = event.touches[0]?.clientY ?? null; }} onTouchEnd={event => { const end = event.changedTouches[0]?.clientY; if (touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 50) go(end < touchStart.current ? 1 : -1); touchStart.current = null; }}><div className="absolute inset-0 bg-gradient-to-b from-foreground/15 via-transparent to-foreground/75" />{current.thumbnail && <img src={current.thumbnail} alt="" className="absolute inset-0 size-full object-cover" />}{current.sourceUrl && <video key={current.id} autoPlay muted={muted} loop playsInline src={current.sourceUrl} poster={current.thumbnail} className="absolute inset-0 size-full object-cover" />}<div className="absolute left-5 right-5 top-5 flex items-center justify-between text-background"><button type="button" data-testid="button-shorts-back" onClick={() => go(-1)} className="flex size-10 items-center justify-center rounded-full bg-foreground/25 backdrop-blur-md"><ChevronLeft className="size-5" /></button><button type="button" data-testid="button-shorts-mute" onClick={() => setMuted(value => !value)} className="flex size-10 items-center justify-center rounded-full bg-foreground/25 backdrop-blur-md">{muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</button></div><div className="absolute inset-x-0 top-[43%] flex justify-center"><span className="flex size-16 items-center justify-center rounded-full bg-foreground/20 text-background backdrop-blur-md"><Play className="ml-1 size-7 fill-current" /></span></div><div className="absolute inset-x-5 bottom-6 text-background"><div className="mb-3 flex items-center gap-2"><Avatar initials={current.initials} small /><span className="text-sm font-bold">{current.creator}</span><button type="button" data-testid="button-shorts-follow" onClick={() => showNotice(`Following ${current.creator}`)} className="rounded-full border border-background/40 px-3 py-1 text-[10px] font-bold">Follow</button></div><Link href={`/watch/${current.id}`} className="block"><h2 className="font-mono text-2xl font-bold leading-tight tracking-[-.04em]">{current.title}</h2></Link><p className="mt-2 line-clamp-2 text-sm leading-5 text-background/80">{current.description}</p><div className="mt-4 flex items-center gap-2"><button type="button" data-testid="button-shorts-like" onClick={like} className="flex min-h-11 items-center gap-2 rounded-full bg-background/20 px-4 text-xs font-bold backdrop-blur-md"><Heart className={`size-4 ${actions.liked.includes(current.id) ? 'fill-primary text-primary' : ''}`} />{current.views}</button><button type="button" data-testid="button-shorts-comment" onClick={() => setCommentOpen(value => !value)} className="flex size-11 items-center justify-center rounded-full bg-background/20 backdrop-blur-md"><MessageCircle className="size-4" /></button><button type="button" data-testid="button-shorts-share" onClick={() => { void actions.share(current); showNotice('Share link ready'); }} className="flex size-11 items-center justify-center rounded-full bg-background/20 backdrop-blur-md"><Send className="size-4" /></button></div>{commentOpen && <form onSubmit={sendComment} className="mt-3 flex gap-2"><input autoFocus value={comment} onChange={event => setComment(event.target.value)} placeholder="Add a comment" className="min-h-10 min-w-0 flex-1 rounded-full border border-background/30 bg-foreground/30 px-4 text-xs text-background outline-none placeholder:text-background/65" /><button type="submit" className="rounded-full bg-primary px-3 text-[10px] font-bold text-primary-foreground">Post</button></form>}</div></div><div className="flex flex-col justify-center lg:pl-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">A new perspective, every swipe</p><h2 className="mt-3 max-w-md font-mono text-4xl font-bold leading-[1.02] tracking-[-.06em] md:text-5xl">Little films for the in-between moments.</h2><p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">Swipe on the video or use the controls. Move at your pace, save what makes you pause, and come back whenever.</p><div className="mt-8 flex gap-2"><button type="button" data-testid="button-shorts-previous" onClick={() => go(-1)} className="flex min-h-12 items-center gap-2 rounded-xl bg-card px-4 text-sm font-bold text-muted-foreground"><ChevronLeft className="size-4" />Previous</button><button type="button" data-testid="button-shorts-next" onClick={() => go(1)} className="flex min-h-12 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-bold text-background">Next short <ChevronRight className="size-4" /></button></div><div className="mt-8 grid max-w-md grid-cols-3 gap-2">{shorts.slice(index + 1, index + 4).map(video => <button key={video.id} type="button" data-testid={`button-short-preview-${video.id}`} onClick={() => setIndex(shorts.findIndex(item => item.id === video.id))} className="group overflow-hidden rounded-xl text-left"><div className="relative aspect-[4/5] overflow-hidden rounded-xl opacity-75 transition-opacity group-hover:opacity-100" style={{ background: video.color }}>{video.thumbnail && <img src={video.thumbnail} alt="" className="absolute inset-0 size-full object-cover" />}</div><p className="mt-2 truncate text-xs font-bold">{video.title}</p></button>)}</div></div></div></div>{notice && <div data-testid="status-shorts-notice" className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-foreground px-4 py-3 text-xs font-bold text-background shadow-xl md:bottom-8">{notice}</div>}</Shell>;
}

function SearchPage({ videos, actions }: { videos: Video[]; actions: ActionProps }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const results = useMemo(() => videos.filter(video => (category === 'All' || video.category === category) && `${video.title} ${video.creator} ${video.description}`.toLowerCase().includes(query.toLowerCase())), [category, query, videos]);
  return <Shell><PageHeading eyebrow="Find a good rabbit hole" title="Discover" description="Search by title, creator, or the feeling you're after." /><div className="relative max-w-2xl"><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} data-testid="input-search-videos" placeholder="Try “morning”, “clay”, or a creator name" className="min-h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-5 text-sm outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10" /></div><div className="hide-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">{['All', ...categories.slice(2)].map(item => <button type="button" key={item} data-testid={`button-search-filter-${item.toLowerCase()}`} onClick={() => setCategory(item)} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold ${category === item ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:bg-muted'}`}>{item}</button>)}</div><div className="mt-9">{results.length ? <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">{results.map(video => <VideoCard key={video.id} video={video} compact liked={actions.liked.includes(video.id)} saved={actions.saved.includes(video.id)} onLike={() => actions.toggleLike(video.id)} onSave={() => actions.toggleSave(video.id)} onShare={() => actions.share(video)} />)}</div> : <EmptyState title="No videos found" description="Try a broader search or choose another category." action={<button type="button" data-testid="button-clear-search" onClick={() => { setQuery(''); setCategory('All'); }} className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">Clear search</button>} />}</div></Shell>;
}

function UploadPage({ onUpload }: { onUpload: (draft: UploadDraft) => Promise<Video> }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Travel');
  const [kind, setKind] = useState<VideoKind>('Video');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [duration, setDuration] = useState('00:00');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview); }, [filePreview]);

  const selectFile = (file?: File) => {
    if (!file || !file.type.startsWith('video/')) return;
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
    setThumbnail('');
  };

  const captureThumbnail = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (!video.videoWidth || thumbnail) return;
    const canvas = document.createElement('canvas');
    const ratio = video.videoWidth / video.videoHeight;
    canvas.width = 720;
    canvas.height = Math.max(405, Math.round(720 / ratio));
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setThumbnail(canvas.toDataURL('image/jpeg', 0.82));
  };

  const handleMetadata = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    setDuration(formatDuration(video.duration));
    video.currentTime = Math.min(0.8, Math.max(0, video.duration / 3));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !selectedFile) return;
    setSaving(true);
    await onUpload({ file: selectedFile, title: title.trim(), description: description.trim() || 'A new video shared on KIVO.', category, kind, duration, thumbnail });
    setSaving(false);
    setSubmitted(true);
  };

  if (submitted) return <Shell><div className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center md:py-24"><span className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"><Check className="size-8" /></span><p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-primary">Saved to this browser</p><h1 className="mt-2 font-mono text-4xl font-bold tracking-[-.06em]">Your {kind.toLowerCase()} is ready.</h1><p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">This prototype keeps the video and its details locally. It has not been uploaded to a server.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><button type="button" data-testid="button-upload-another" onClick={() => { setSubmitted(false); setTitle(''); setDescription(''); setSelectedFile(null); setFilePreview(''); setThumbnail(''); setDuration('00:00'); }} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground">Upload another</button><Link href="/profile" data-testid="link-upload-profile" className="flex min-h-11 items-center rounded-xl bg-card px-5 text-sm font-bold">View My Profile</Link></div></div></Shell>;

  return <Shell><PageHeading eyebrow="Make something shareable" title="Upload a video" description="Preview it, add context, and keep the demo safely in this browser. Nothing is sent to a server." /><form onSubmit={submit} className="grid max-w-5xl gap-6 lg:grid-cols-[.8fr_1.2fr]"><div className="space-y-4"><label data-testid="dropzone-upload" className="flex min-h-[250px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center transition-colors hover:border-primary hover:bg-primary/[.03]"><input data-testid="input-video-file" type="file" accept="video/*" className="sr-only" onChange={event => selectFile(event.target.files?.[0])} /><span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">{selectedFile ? <FileVideo className="size-6" /> : <Upload className="size-6" />}</span><h2 className="mt-5 max-w-full truncate text-sm font-bold">{selectedFile?.name || 'Choose a video file'}</h2><p className="mt-2 max-w-[240px] text-xs leading-5 text-muted-foreground">{selectedFile ? `${duration} · ${kind === 'Short' ? 'Vertical Short' : 'Video'}` : 'MP4, MOV, or WebM'}</p>{selectedFile && <span className="mt-5 rounded-lg bg-muted px-3 py-2 text-xs font-bold">Replace file</span>}</label>{filePreview && <div className="overflow-hidden rounded-2xl border border-border bg-card p-2"><video ref={videoRef} src={filePreview} controls playsInline preload="metadata" onLoadedMetadata={handleMetadata} onSeeked={captureThumbnail} className="aspect-video w-full rounded-xl bg-black object-contain" />{thumbnail && <div className="mt-3 flex items-center gap-3 px-2 pb-1"><img src={thumbnail} alt="Generated video thumbnail" className="size-14 rounded-lg object-cover" /><div><p className="text-xs font-bold">Thumbnail captured</p><p className="mt-1 text-xs text-muted-foreground">A frame from your local video will represent it in KIVO.</p></div></div>}</div>}</div><div className="rounded-2xl bg-card p-5 shadow-[0_7px_32px_hsl(0_0%_0%/.24)] md:p-7"><div className="space-y-5"><div><span className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Format</span><div className="grid grid-cols-2 gap-2"><button type="button" data-testid="button-upload-kind-video" onClick={() => setKind('Video')} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold ${kind === 'Video' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}><Clapperboard className="size-4" />Video</button><button type="button" data-testid="button-upload-kind-short" onClick={() => setKind('Short')} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold ${kind === 'Short' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}><Play className="size-4" />Short</button></div>{kind === 'Short' && <p className="mt-2 flex items-center gap-2 text-xs text-primary"><Sparkles className="size-3.5" />Best viewed in a vertical 9:16 frame.</p>}</div><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Title</span><input data-testid="input-upload-title" value={title} onChange={event => setTitle(event.target.value)} required placeholder="Give your video a name" className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Description <span className="normal-case tracking-normal font-normal">(optional)</span></span><textarea data-testid="input-upload-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="What should people know before they watch?" rows={4} className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Category</span><select data-testid="select-upload-category" value={category} onChange={event => setCategory(event.target.value)} className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary">{['Travel', 'Create', 'Food', 'Music', 'Lifestyle', 'Film'].map(item => <option key={item}>{item}</option>)}</select></label></div><div className="mt-7 flex items-center justify-between border-t border-border pt-5"><p className="hidden text-xs text-muted-foreground sm:block">Local prototype only.</p><button type="submit" data-testid="button-submit-upload" disabled={!title.trim() || !selectedFile || saving} className="ml-auto flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"><Upload className="size-4" />{saving ? 'Saving locally…' : 'Save to KIVO'}</button></div></div></form></Shell>;
}

function ProfileAuthCard() {
  const { isLoaded, user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">Loading account…</div>;
  }

  return <div className="rounded-2xl border border-border bg-card p-5">
    <Show when="signed-out">
      <p className="text-sm font-bold">Sign in to your KIVO account</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Use Google or email and password to keep your account identity with KIVO.</p>
      <Link href="/sign-in" data-testid="link-profile-sign-in" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Continue to sign in</Link>
      <p className="mt-3 text-xs text-muted-foreground">Phone-number sign-in is not available in the managed KIVO auth setup.</p>
    </Show>
    <Show when="signed-in">
      {user && <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <img src={user.imageUrl} alt="" className="size-12 rounded-full bg-muted object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{user.fullName || user.username || 'KIVO member'}</p>
          <p className="truncate text-xs text-muted-foreground">{user.primaryEmailAddress?.emailAddress || 'Signed in with Google'}</p>
        </div>
        <button type="button" data-testid="button-profile-sign-out" onClick={() => { void signOut({ redirectUrl: basePath || '/' }); }} className="min-h-10 rounded-xl bg-muted px-4 text-xs font-bold text-muted-foreground hover:text-foreground">Sign out</button>
      </div>}
    </Show>
  </div>;
}

function ProfilePage({ actions, localVideos }: { actions: ActionProps; localVideos: Video[] }) {
  const [tab, setTab] = useState<'videos' | 'saved'>('videos');
  const profileVideos = tab === 'videos' ? localVideos : localVideos.filter(video => actions.saved.includes(video.id));
  return <Shell><div className="border-b border-border py-8 md:py-12"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="flex size-20 items-center justify-center rounded-[25px] bg-primary text-2xl font-bold text-primary-foreground">K</span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">KIVO account</p><h1 className="mt-1 font-mono text-3xl font-bold tracking-[-.06em]">My Profile</h1><p className="mt-2 text-sm text-muted-foreground">{localVideos.length} local uploads · stored in this browser</p></div><Link href="/upload" className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground sm:ml-auto"><Plus className="size-4" />New upload</Link></div><p className="mt-6 max-w-xl text-sm leading-6 text-muted-foreground">Your uploads live here while you prototype KIVO. They are stored in this browser and are not public yet.</p><div className="mt-6"><ProfileAuthCard /></div></div><div className="flex gap-6 border-b border-border"><button type="button" data-testid="button-profile-videos-tab" onClick={() => setTab('videos')} className={`min-h-14 border-b-2 px-1 text-sm font-bold ${tab === 'videos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>My uploads <span className="ml-1 text-xs opacity-60">{localVideos.length}</span></button><button type="button" data-testid="button-profile-saved-tab" onClick={() => setTab('saved')} className={`min-h-14 border-b-2 px-1 text-sm font-bold ${tab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Saved uploads <span className="ml-1 text-xs opacity-60">{localVideos.filter(video => actions.saved.includes(video.id)).length}</span></button></div><section className="py-8">{profileVideos.length ? <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">{profileVideos.map(video => <VideoCard key={video.id} video={video} compact liked={actions.liked.includes(video.id)} saved={actions.saved.includes(video.id)} onLike={() => actions.toggleLike(video.id)} onSave={() => actions.toggleSave(video.id)} onShare={() => actions.share(video)} />)}</div> : <EmptyState title={tab === 'videos' ? 'Your local shelf is empty' : 'No saved uploads yet'} description={tab === 'videos' ? 'Upload a video or Short and it will appear here.' : 'Save one of your uploaded videos to see it here.'} action={<Link href={tab === 'videos' ? '/upload' : '/'} data-testid="link-profile-discover" className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">{tab === 'videos' ? 'Upload a video' : 'Browse videos'}</Link>} />}</section></Shell>;
}

function WatchPage({ videos, actions }: { videos: Video[]; actions: ActionProps }) {
  const { id } = useParams<{ id: string }>();
  const video = videos.find(item => item.id === id);
  const [following, setFollowing] = useState(false);
  const [comment, setComment] = useState('');
  const [commentSent, setCommentSent] = useState(false);
  if (!video) return <NotFoundPage />;
  const submitComment = (event: FormEvent) => { event.preventDefault(); if (!comment.trim()) return; setComment(''); setCommentSent(true); };
   return <Shell><div className="mx-auto max-w-4xl py-8 md:py-12"><Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" />Back to feed</Link><div className="overflow-hidden rounded-2xl bg-card p-2 shadow-[0_8px_36px_hsl(0_0%_0%/.28)]"><div className="relative overflow-hidden rounded-xl bg-black">{video.sourceUrl ? <video src={video.sourceUrl} poster={video.thumbnail} controls autoPlay playsInline className="max-h-[68vh] min-h-[240px] w-full object-contain" /> : <VideoThumb video={video} large />}</div><div className="p-4 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">{video.kind === 'Short' ? 'Short' : video.category}</p><h1 className="mt-2 font-mono text-3xl font-bold tracking-[-.05em] md:text-4xl">{video.title}</h1><p className="mt-2 text-sm text-muted-foreground">{video.views} views · {video.posted} · {video.creator}</p></div><button type="button" onClick={() => setFollowing(value => !value)} className={`flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold ${following ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'}`}><Users className="size-4" />{following ? 'Following' : 'Follow'}</button></div><p className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground">{video.description}</p>{video.isLocal && <p className="mt-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-xs text-primary">Local demo media · this video is stored in your browser and has not been uploaded to a server.</p>}{!video.sourceUrl && <p className="mt-4 rounded-xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground">This local video's original file is unavailable in this browser. Upload it again to restore playback.</p>}<div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5"><button type="button" onClick={() => actions.toggleLike(video.id)} className={`flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold ${actions.liked.includes(video.id) ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}><Heart className={`size-4 ${actions.liked.includes(video.id) ? 'fill-current' : ''}`} />{actions.liked.includes(video.id) ? 'Liked' : 'Like'}</button><button type="button" onClick={() => actions.toggleSave(video.id)} className={`flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold ${actions.saved.includes(video.id) ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'}`}><Bookmark className={`size-4 ${actions.saved.includes(video.id) ? 'fill-current' : ''}`} />{actions.saved.includes(video.id) ? 'Saved' : 'Save'}</button><button type="button" onClick={() => { void actions.share(video); }} className="flex min-h-10 items-center gap-2 rounded-xl bg-muted px-4 text-xs font-bold text-muted-foreground"><Share2 className="size-4" />Share</button></div><form onSubmit={submitComment} className="mt-7 flex gap-2"><input value={comment} onChange={event => setComment(event.target.value)} placeholder="Leave a comment in this local demo" className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary" /><button type="submit" className="flex min-h-11 items-center gap-2 rounded-xl bg-foreground px-4 text-xs font-bold text-background"><MessageCircle className="size-4" />Comment</button></form>{commentSent && <p className="mt-3 text-xs font-bold text-primary">Comment added locally for this prototype.</p>}</div></div></div></Shell>;
}

function NotFoundPage() {
  const [, setLocation] = useLocation();
  return <Shell><div className="flex min-h-[70vh] flex-col items-center justify-center text-center"><p className="font-mono text-7xl font-bold text-primary">404</p><h1 className="mt-4 font-mono text-3xl font-bold">This video wandered off.</h1><p className="mt-3 text-sm text-muted-foreground">Let's take you somewhere a little more interesting.</p><button type="button" data-testid="button-not-found-home" onClick={() => setLocation('/')} className="mt-7 rounded-xl bg-foreground px-5 py-3 text-sm font-bold text-background">Go home</button></div></Shell>;
}

function Router({ videos, actions, localVideos, onUpload }: { videos: Video[]; actions: ActionProps; localVideos: Video[]; onUpload: (draft: UploadDraft) => Promise<Video> }) {
  return <Switch><Route path="/sign-in/*?" component={() => <SignInPage />} /><Route path="/sign-up/*?" component={() => <SignUpPage />} /><Route path="/" component={() => <HomePage videos={videos} actions={actions} />} /><Route path="/shorts" component={() => <ShortsPage videos={videos} actions={actions} />} /><Route path="/upload" component={() => <UploadPage onUpload={onUpload} />} /><Route path="/search" component={() => <SearchPage videos={videos} actions={actions} />} /><Route path="/profile" component={() => <ProfilePage actions={actions} localVideos={localVideos} />} /><Route path="/watch/:id" component={() => <WatchPage videos={videos} actions={actions} />} /><Route component={NotFoundPage} /></Switch>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function SignInPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function ClerkApp() {
  const [, setLocation] = useLocation();
  const [localVideos, setLocalVideos] = useState<Video[]>([]);
  const localMediaUrls = useRef<string[]>([]);
  const localReady = useRef(false);
  const storedActions = useMemo(readStoredIds, []);
  const [liked, setLiked] = useState<string[]>(storedActions.liked);
  const [saved, setSaved] = useState<string[]>(storedActions.saved);

  useEffect(() => {
    let active = true;
    const loadLocalVideos = async () => {
      try {
        const raw = localStorage.getItem(LOCAL_METADATA_KEY);
        const metadata = raw ? JSON.parse(raw) as Video[] : [];
        const hydrated = await Promise.all(metadata.map(async video => {
          if (!video.mediaId) return video;
          const blob = await readMediaBlob(video.mediaId).catch(() => undefined);
          if (!blob) return video;
          const sourceUrl = URL.createObjectURL(blob);
          localMediaUrls.current.push(sourceUrl);
          return { ...video, sourceUrl };
        }));
        if (active) setLocalVideos(hydrated);
      } catch {
        if (active) setLocalVideos([]);
      } finally {
        localReady.current = true;
      }
    };
    void loadLocalVideos();
    return () => { active = false; localMediaUrls.current.forEach(url => URL.revokeObjectURL(url)); };
  }, []);

  useEffect(() => {
    if (localReady.current) localStorage.setItem(LOCAL_METADATA_KEY, JSON.stringify(localVideos.map(serializableVideo)));
  }, [localVideos]);

  useEffect(() => {
    localStorage.setItem(LOCAL_ACTIONS_KEY, JSON.stringify({ liked, saved }));
  }, [liked, saved]);

  const allVideos = useMemo(() => localVideos, [localVideos]);
  const actions: ActionProps = {
    liked,
    saved,
    toggleLike: id => setLiked(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]),
    toggleSave: id => setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]),
    share: video => { void shareVideo(video); },
  };

  const handleUpload = async (draft: UploadDraft) => {
    const id = `local-${Date.now()}`;
    await saveMediaBlob(id, draft.file);
    const sourceUrl = URL.createObjectURL(draft.file);
    const newVideo: Video = {
      id,
      title: draft.title,
      creator: 'My Profile',
      initials: 'K',
      duration: draft.duration,
      views: '0',
      posted: 'just now',
      color: 'linear-gradient(135deg,#d8ff4f 0%,#86a8a0 48%,#19252a 100%)',
      category: draft.category,
      description: draft.description,
      kind: draft.kind,
      thumbnail: draft.thumbnail,
      mediaId: id,
      sourceUrl,
      isLocal: true,
    };
    localMediaUrls.current.push(sourceUrl);
    setLocalVideos(current => [newVideo, ...current]);
    return newVideo;
  };

  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: { start: { title: 'Welcome back', subtitle: 'Sign in to KIVO' } },
      signUp: { start: { title: 'Create your KIVO account', subtitle: 'Share what you make' } },
    }}
    routerPush={to => setLocation(stripBase(to))}
    routerReplace={to => setLocation(stripBase(to), { replace: true })}
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RoutedErrorBoundary>
          <Router videos={allVideos} actions={actions} localVideos={localVideos} onUpload={handleUpload} />
        </RoutedErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  return <WouterRouter base={basePath}><ClerkApp /></WouterRouter>;
}

export default App;