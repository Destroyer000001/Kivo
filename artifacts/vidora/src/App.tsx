import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Bookmark, Check, ChevronLeft, ChevronRight, Compass, FileVideo, Heart, Home, Menu, MoreHorizontal, Play, Plus, Search, Send, Settings, Share2, Sparkles, Upload, UserRound, Volume2, VolumeX, X } from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient();

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
};

const videos: Video[] = [
  { id: 'v1', title: 'A quiet morning in Lisbon', creator: 'Mara Sol', initials: 'MS', duration: '08:24', views: '24.8K', posted: '2h ago', color: 'linear-gradient(135deg,#e8a07a 0%,#e9d7b8 47%,#577f7e 100%)', category: 'Travel', description: 'A slow walk through Alfama before the city wakes up.' },
  { id: 'v2', title: 'The 15-minute desk reset', creator: 'Niko Park', initials: 'NP', duration: '12:06', views: '11.2K', posted: '5h ago', color: 'linear-gradient(135deg,#c9d8bd,#74948b 52%,#374e59)', category: 'Lifestyle', description: 'Small changes that make a workday feel a little lighter.' },
  { id: 'v3', title: 'Making ramen from scratch', creator: 'June Atelier', initials: 'JA', duration: '18:42', views: '48.7K', posted: '1d ago', color: 'linear-gradient(135deg,#d86d52,#e9af59 45%,#33464b)', category: 'Food', description: 'Broth, noodles, and the patience in between.' },
  { id: 'v4', title: 'Notes from a rainy train', creator: 'Theo North', initials: 'TN', duration: '06:19', views: '8.4K', posted: '1d ago', color: 'linear-gradient(135deg,#a4b7cb,#657892 52%,#252d47)', category: 'Film', description: 'A pocket film from the coastal line north.' },
  { id: 'v5', title: 'Clay, water, and a little patience', creator: 'Inez Rowe', initials: 'IR', duration: '09:51', views: '19.3K', posted: '2d ago', color: 'linear-gradient(135deg,#dcae8b,#b86d62 48%,#5c4d62)', category: 'Create', description: 'Hand-building a simple cup in one afternoon.' },
  { id: 'v6', title: 'The city sounds at 6:17', creator: 'Luca Venn', initials: 'LV', duration: '04:38', views: '31.5K', posted: '3d ago', color: 'linear-gradient(135deg,#f1c86b,#d77759 46%,#453e66)', category: 'Music', description: 'Field recordings and a short walk through downtown.' },
  { id: 'v7', title: 'Tiny garden, big harvest', creator: 'Pia & Co.', initials: 'PC', duration: '07:11', views: '17.9K', posted: '4d ago', color: 'linear-gradient(135deg,#aacd9d,#628e72 53%,#34515a)', category: 'Lifestyle', description: 'What grew well in our smallest growing season yet.' },
  { id: 'v8', title: 'How I frame a room', creator: 'Amari Reed', initials: 'AR', duration: '14:12', views: '12.6K', posted: '5d ago', color: 'linear-gradient(135deg,#dfb4aa,#c47d84 47%,#5b4869)', category: 'Create', description: 'A practical guide to finding the shot in ordinary spaces.' },
];

const categories = ['For you', 'Following', 'Travel', 'Create', 'Food', 'Music'];

function Avatar({ initials, small = false }: { initials: string; small?: boolean }) {
  return <span data-testid={`avatar-${initials}`} className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#d9eee6] font-bold text-[#265a58] ${small ? 'size-8 text-[10px]' : 'size-10 text-xs'}`}>{initials}</span>;
}

function Logo() {
  return <Link href="/" data-testid="link-logo" className="flex items-center gap-2 text-foreground">
    <span className="relative flex size-8 items-center justify-center rounded-[11px] bg-primary text-primary-foreground shadow-sm"><Play className="ml-0.5 size-4 fill-current" /></span>
    <span className="font-mono text-[21px] font-bold tracking-[-.07em]">vidora</span>
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
  return <div className="vidora-shell min-h-[100dvh]">
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
  return <div className="flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between md:py-12">{<div>{eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</p>}<h1 className="font-mono text-3xl font-bold tracking-[-.05em] md:text-5xl">{title}</h1>{description && <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">{description}</p>}</div>}{action}</div>;
}

function VideoThumb({ video, large = false }: { video: Video; large?: boolean }) {
  return <div className={`video-art relative overflow-hidden ${large ? 'aspect-[16/9]' : 'aspect-video'} rounded-[18px]`} style={{ background: video.color }}>
    <div className="absolute inset-0 flex items-center justify-center"><span className={`flex items-center justify-center rounded-full border border-white/40 bg-[#1d2c35]/25 text-white backdrop-blur-md ${large ? 'size-14' : 'size-11'}`}><Play className="ml-1 size-5 fill-current" /></span></div>
    <span className="absolute bottom-3 right-3 rounded-md bg-foreground/75 px-2 py-1 font-mono text-[10px] font-bold text-background">{video.duration}</span>
    <span className="absolute left-3 top-3 rounded-md bg-background/75 px-2 py-1 text-[10px] font-bold text-foreground backdrop-blur-md">{video.category}</span>
  </div>;
}

function VideoCard({ video, liked, saved, onLike, onSave, compact = false }: { video: Video; liked: boolean; saved: boolean; onLike: () => void; onSave: () => void; compact?: boolean }) {
  return <article data-testid={`card-video-${video.id}`} className={`group ${compact ? '' : 'rounded-2xl bg-card p-2 shadow-[0_5px_24px_hsl(226_31%_16%/.04)]'}`}>
    <VideoThumb video={video} />
    <div className={`${compact ? 'pt-3' : 'px-1 pb-1 pt-3'}`}>
      <div className="flex gap-3"><Avatar initials={video.initials} small /><div className="min-w-0 flex-1"><h3 data-testid={`text-video-title-${video.id}`} className="truncate text-[15px] font-bold leading-5 group-hover:text-primary">{video.title}</h3><p className="mt-1 text-xs text-muted-foreground">{video.creator} · {video.views} views · {video.posted}</p></div><button type="button" data-testid={`button-more-${video.id}`} aria-label={`More options for ${video.title}`} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><MoreHorizontal className="size-4" /></button></div>
      <div className="mt-3 flex gap-2 border-t border-border/70 pt-2"><button type="button" data-testid={`button-like-${video.id}`} onClick={onLike} className={`flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors ${liked ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}><Heart className={`size-4 ${liked ? 'fill-current' : ''}`} />{liked ? 'Liked' : 'Like'}</button><button type="button" data-testid={`button-save-${video.id}`} onClick={onSave} className={`flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors ${saved ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted'}`}><Bookmark className={`size-4 ${saved ? 'fill-current' : ''}`} />{saved ? 'Saved' : 'Save'}</button><button type="button" data-testid={`button-share-${video.id}`} onClick={() => navigator.clipboard?.writeText(video.title)} className="ml-auto flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Share video"><Share2 className="size-4" /></button></div>
    </div>
  </article>;
}

function useVideoActions() {
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  return { liked, saved, toggleLike: (id: string) => setLiked(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]), toggleSave: (id: string) => setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]) };
}

function HomePage() {
  const actions = useVideoActions();
  const [activeCategory, setActiveCategory] = useState('For you');
  const visible = activeCategory === 'For you' || activeCategory === 'Following' ? videos : videos.filter(video => video.category === activeCategory);
  return <Shell><PageHeading eyebrow="A little something to watch" title={<>Find your next <span className="text-primary">favorite.</span></>} description="A friendly corner for thoughtful videos, curious makers, and the occasional rabbit hole." action={<Link href="/upload" data-testid="link-home-upload" className="hidden min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 sm:flex"><Upload className="size-4" />Share a video</Link>} />
    <div className="hide-scrollbar -mx-1 mb-8 flex gap-2 overflow-x-auto px-1 pb-1">{categories.map(category => <button type="button" key={category} data-testid={`button-category-${category.toLowerCase().replace(' ', '-')}`} onClick={() => setActiveCategory(category)} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold transition-colors ${activeCategory === category ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:bg-muted'}`}>{category}</button>)}</div>
    {visible.length === 0 ? <EmptyState title="Nothing in this corner yet" description="Try another category and we'll keep looking." action={<button type="button" data-testid="button-reset-category" onClick={() => setActiveCategory('For you')} className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">Back to For you</button>} /> : <><div className="grid gap-5 lg:grid-cols-[1.28fr_.72fr]"><div className="rounded-2xl bg-card p-2 shadow-[0_7px_32px_hsl(226_31%_16%/.05)]"><VideoThumb video={visible[0]} large /><div className="p-3 md:p-4"><p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-primary">Picked for you</p><h2 className="font-mono text-2xl font-bold tracking-[-.05em] md:text-3xl">{visible[0].title}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{visible[0].description}</p><div className="mt-4 flex items-center gap-3"><Avatar initials={visible[0].initials} small /><div className="text-xs"><p className="font-bold">{visible[0].creator}</p><p className="text-muted-foreground">{visible[0].views} views · {visible[0].posted}</p></div><button type="button" data-testid={`button-featured-like-${visible[0].id}`} onClick={() => actions.toggleLike(visible[0].id)} className={`ml-auto flex size-10 items-center justify-center rounded-xl ${actions.liked.includes(visible[0].id) ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}><Heart className={`size-[18px] ${actions.liked.includes(visible[0].id) ? 'fill-current' : ''}`} /></button></div></div></div><div className="hidden rounded-2xl bg-secondary/55 p-6 lg:flex lg:flex-col lg:justify-between"><div><div className="mb-8 flex size-11 items-center justify-center rounded-2xl bg-card text-primary"><Sparkles className="size-5" /></div><p className="text-xs font-bold uppercase tracking-[.18em] text-secondary-foreground/65">Today on Vidora</p><h2 className="mt-3 max-w-xs font-mono text-3xl font-bold leading-[1.06] tracking-[-.06em] text-secondary-foreground">Slow down. Stay curious.</h2></div><div><p className="max-w-xs text-sm leading-6 text-secondary-foreground/75">Discover people making things because they care, not because they have to.</p><Link href="/shorts" data-testid="link-home-shorts" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-secondary-foreground px-4 text-xs font-bold text-secondary">Browse Shorts <ChevronRight className="size-4" /></Link></div></div></div><section className="mt-10"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Keep exploring</p><h2 className="mt-1 font-mono text-2xl font-bold tracking-[-.05em]">Fresh from the community</h2></div><span className="text-xs text-muted-foreground">{visible.length} videos</span></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{visible.slice(1).map(video => <VideoCard key={video.id} video={video} liked={actions.liked.includes(video.id)} saved={actions.saved.includes(video.id)} onLike={() => actions.toggleLike(video.id)} onSave={() => actions.toggleSave(video.id)} />)}</div></section></>}
  </Shell>;
}

function ShortsPage() {
  const actions = useVideoActions();
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [notice, setNotice] = useState('');
  const current = videos[index % videos.length];
  const go = (direction: number) => setIndex(value => (value + direction + videos.length) % videos.length);
  const like = () => { actions.toggleLike(current.id); setNotice(actions.liked.includes(current.id) ? '' : 'Added to your likes'); window.setTimeout(() => setNotice(''), 1800); };
  return <Shell><div className="mx-auto max-w-[1050px] py-6 md:py-10"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Quick watch</p><h1 className="mt-1 font-mono text-3xl font-bold tracking-[-.05em]">Shorts</h1></div><div className="rounded-full bg-card px-3 py-2 text-xs font-bold text-muted-foreground">{index + 1} / {videos.length}</div></div><div className="grid gap-5 lg:grid-cols-[minmax(280px,530px)_1fr] lg:items-center"><div className="relative mx-auto aspect-[9/15] w-full max-w-[430px] overflow-hidden rounded-[28px] bg-foreground shadow-2xl shadow-foreground/15" style={{ background: current.color }}><div className="absolute inset-0 bg-gradient-to-b from-foreground/15 via-transparent to-foreground/75" /><div className="absolute left-5 right-5 top-5 flex items-center justify-between text-background"><button type="button" data-testid="button-shorts-back" onClick={() => go(-1)} className="flex size-10 items-center justify-center rounded-full bg-foreground/25 backdrop-blur-md"><ChevronLeft className="size-5" /></button><button type="button" data-testid="button-shorts-mute" onClick={() => setMuted(value => !value)} className="flex size-10 items-center justify-center rounded-full bg-foreground/25 backdrop-blur-md">{muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}</button></div><div className="absolute inset-x-0 top-[43%] flex justify-center"><span className="flex size-16 items-center justify-center rounded-full bg-foreground/20 text-background backdrop-blur-md"><Play className="ml-1 size-7 fill-current" /></span></div><div className="absolute inset-x-5 bottom-6 text-background"><div className="mb-3 flex items-center gap-2"><Avatar initials={current.initials} small /><span className="text-sm font-bold">{current.creator}</span><button type="button" data-testid="button-shorts-follow" onClick={() => setNotice('Following ' + current.creator)} className="rounded-full border border-background/40 px-3 py-1 text-[10px] font-bold">Follow</button></div><h2 className="font-mono text-2xl font-bold leading-tight tracking-[-.04em]">{current.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-5 text-background/80">{current.description}</p><div className="mt-4 flex items-center gap-3"><button type="button" data-testid="button-shorts-like" onClick={like} className="flex min-h-11 items-center gap-2 rounded-full bg-background/20 px-4 text-xs font-bold backdrop-blur-md"><Heart className={`size-4 ${actions.liked.includes(current.id) ? 'fill-primary text-primary' : ''}`} />{current.views}</button><button type="button" data-testid="button-shorts-save" onClick={() => actions.toggleSave(current.id)} className="flex size-11 items-center justify-center rounded-full bg-background/20 backdrop-blur-md"><Bookmark className={`size-4 ${actions.saved.includes(current.id) ? 'fill-accent text-accent' : ''}`} /></button><button type="button" data-testid="button-shorts-share" onClick={() => setNotice('Link copied to clipboard')} className="flex size-11 items-center justify-center rounded-full bg-background/20 backdrop-blur-md"><Send className="size-4" /></button></div></div></div><div className="flex flex-col justify-center lg:pl-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">A new perspective, every swipe</p><h2 className="mt-3 max-w-md font-mono text-4xl font-bold leading-[1.02] tracking-[-.06em] md:text-5xl">Little films for the in-between moments.</h2><p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">No pressure to keep up. Move at your pace, save what makes you pause, and come back whenever.</p><div className="mt-8 flex gap-2"><button type="button" data-testid="button-shorts-previous" onClick={() => go(-1)} className="flex min-h-12 items-center gap-2 rounded-xl bg-card px-4 text-sm font-bold text-muted-foreground"><ChevronLeft className="size-4" />Previous</button><button type="button" data-testid="button-shorts-next" onClick={() => go(1)} className="flex min-h-12 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-bold text-background">Next short <ChevronRight className="size-4" /></button></div><div className="mt-8 grid max-w-md grid-cols-3 gap-2">{videos.slice(index + 1, index + 4).map((video, itemIndex) => <button key={video.id} type="button" data-testid={`button-short-preview-${video.id}`} onClick={() => setIndex((index + itemIndex + 1) % videos.length)} className="group overflow-hidden rounded-xl text-left"><div className="aspect-[4/5] rounded-xl opacity-75 transition-opacity group-hover:opacity-100" style={{ background: video.color }} /><p className="mt-2 truncate text-xs font-bold">{video.title}</p></button>)}</div></div></div></div>{notice && <div data-testid="status-shorts-notice" className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-foreground px-4 py-3 text-xs font-bold text-background shadow-xl md:bottom-8">{notice}</div>}</Shell>;
}

function SearchPage() {
  const actions = useVideoActions();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const results = useMemo(() => videos.filter(video => (category === 'All' || video.category === category) && `${video.title} ${video.creator} ${video.description}`.toLowerCase().includes(query.toLowerCase())), [category, query]);
  return <Shell><PageHeading eyebrow="Find a good rabbit hole" title="Discover" description="Search by title, creator, or the feeling you're after." /><div className="relative max-w-2xl"><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} data-testid="input-search-videos" placeholder="Try “morning”, “clay”, or a creator name" className="min-h-14 w-full rounded-2xl border border-border bg-card pl-12 pr-5 text-sm outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10" /></div><div className="hide-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">{['All', ...categories.slice(2)].map(item => <button type="button" key={item} data-testid={`button-search-filter-${item.toLowerCase()}`} onClick={() => setCategory(item)} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold ${category === item ? 'bg-foreground text-background' : 'bg-card text-muted-foreground hover:bg-muted'}`}>{item}</button>)}</div><div className="mt-9">{results.length ? <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">{results.map(video => <VideoCard key={video.id} video={video} compact liked={actions.liked.includes(video.id)} saved={actions.saved.includes(video.id)} onLike={() => actions.toggleLike(video.id)} onSave={() => actions.toggleSave(video.id)} />)}</div> : <EmptyState title="No videos found" description="Try a broader search or choose another category." action={<button type="button" data-testid="button-clear-search" onClick={() => { setQuery(''); setCategory('All'); }} className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">Clear search</button>} />}</div></Shell>;
}

function UploadPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Travel');
  const [fileName, setFileName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!title.trim() || !fileName) return; setSubmitted(true); };
  if (submitted) return <Shell><div className="mx-auto flex max-w-2xl flex-col items-center py-16 text-center md:py-24"><span className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"><Check className="size-8" /></span><p className="mt-7 text-xs font-bold uppercase tracking-[.18em] text-primary">Ready to share</p><h1 className="mt-2 font-mono text-4xl font-bold tracking-[-.06em]">Your video is staged.</h1><p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">This local demo keeps your upload on this screen. In a real Vidora, it would be ready for the community.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><button type="button" data-testid="button-upload-another" onClick={() => { setSubmitted(false); setTitle(''); setDescription(''); setFileName(''); }} className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground">Upload another</button><Link href="/" data-testid="link-upload-home" className="flex min-h-11 items-center rounded-xl bg-card px-5 text-sm font-bold">Back to home</Link></div></div></Shell>;
  return <Shell><PageHeading eyebrow="Make something shareable" title="Upload a video" description="A title, a little context, and you're ready to go. This demo stays local to your browser." /><form onSubmit={submit} className="grid max-w-5xl gap-6 lg:grid-cols-[.8fr_1.2fr]"><label data-testid="dropzone-upload" className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center transition-colors hover:border-primary hover:bg-primary/[.03]"><input data-testid="input-video-file" type="file" accept="video/*" className="sr-only" onChange={event => setFileName(event.target.files?.[0]?.name ?? '')} /><span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">{fileName ? <FileVideo className="size-6" /> : <Upload className="size-6" />}</span><h2 className="mt-5 text-sm font-bold">{fileName || 'Choose a video file'}</h2><p className="mt-2 max-w-[220px] text-xs leading-5 text-muted-foreground">{fileName ? 'Looks good. You can replace it any time.' : 'MP4, MOV, or WebM up to 2 GB'}</p>{fileName && <span className="mt-5 rounded-lg bg-muted px-3 py-2 text-xs font-bold">Replace file</span>}</label><div className="rounded-2xl bg-card p-5 shadow-[0_7px_32px_hsl(226_31%_16%/.04)] md:p-7"><div className="space-y-5"><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Title</span><input data-testid="input-upload-title" value={title} onChange={event => setTitle(event.target.value)} required placeholder="Give your video a name" className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Description <span className="normal-case tracking-normal font-normal">(optional)</span></span><textarea data-testid="input-upload-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="What should people know before they watch?" rows={4} className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">Category</span><select data-testid="select-upload-category" value={category} onChange={event => setCategory(event.target.value)} className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"><option>Travel</option><option>Create</option><option>Food</option><option>Music</option><option>Lifestyle</option><option>Film</option></select></label></div><div className="mt-7 flex items-center justify-between border-t border-border pt-5"><p className="hidden text-xs text-muted-foreground sm:block">You can edit this later.</p><button type="submit" data-testid="button-submit-upload" disabled={!title.trim() || !fileName} className="ml-auto flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40"><Upload className="size-4" />Stage video</button></div></div></form></Shell>;
}

function ProfilePage() {
  const [tab, setTab] = useState<'videos' | 'saved'>('videos');
  const actions = useVideoActions();
  const profileVideos = tab === 'videos' ? videos.slice(0, 4) : videos.filter(video => actions.saved.includes(video.id));
  return <Shell><div className="border-b border-border py-8 md:py-12"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="flex size-20 items-center justify-center rounded-[25px] bg-primary text-2xl font-bold text-primary-foreground">AM</span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Creator profile</p><h1 className="mt-1 font-mono text-3xl font-bold tracking-[-.06em]">Ari Mendez</h1><p className="mt-2 text-sm text-muted-foreground">@arimakes · 28 videos · 1.8K followers</p></div><button type="button" data-testid="button-edit-profile" onClick={() => window.alert('Profile editing is part of this local demo.')} className="min-h-10 rounded-xl bg-card px-4 text-xs font-bold sm:ml-auto">Edit profile</button></div><p className="mt-6 max-w-xl text-sm leading-6 text-muted-foreground">Making small films about big feelings, better breakfasts, and the places in between.</p></div><div className="flex gap-6 border-b border-border"><button type="button" data-testid="button-profile-videos-tab" onClick={() => setTab('videos')} className={`min-h-14 border-b-2 px-1 text-sm font-bold ${tab === 'videos' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>My videos <span className="ml-1 text-xs opacity-60">28</span></button><button type="button" data-testid="button-profile-saved-tab" onClick={() => setTab('saved')} className={`min-h-14 border-b-2 px-1 text-sm font-bold ${tab === 'saved' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Saved <span className="ml-1 text-xs opacity-60">{actions.saved.length}</span></button></div><section className="py-8">{profileVideos.length ? <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">{profileVideos.map(video => <VideoCard key={video.id} video={video} compact liked={actions.liked.includes(video.id)} saved={actions.saved.includes(video.id)} onLike={() => actions.toggleLike(video.id)} onSave={() => actions.toggleSave(video.id)} />)}</div> : <EmptyState title="Your saved shelf is empty" description="Tap Save on a video and it will show up here." action={<Link href="/" data-testid="link-profile-discover" className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background">Discover videos</Link>} />}</section></Shell>;
}

function EmptyState({ title, description, action }: { title: string; description: string; action: ReactNode }) {
  return <div data-testid="empty-state" className="flex min-h-[290px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 text-center"><span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Search className="size-5" /></span><h2 className="mt-4 font-mono text-xl font-bold tracking-[-.04em]">{title}</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p><div className="mt-5">{action}</div></div>;
}

function NotFoundPage() {
  const [, setLocation] = useLocation();
  return <Shell><div className="flex min-h-[70vh] flex-col items-center justify-center text-center"><p className="font-mono text-7xl font-bold text-primary">404</p><h1 className="mt-4 font-mono text-3xl font-bold">This video wandered off.</h1><p className="mt-3 text-sm text-muted-foreground">Let's take you somewhere a little more interesting.</p><button type="button" data-testid="button-not-found-home" onClick={() => setLocation('/')} className="mt-7 rounded-xl bg-foreground px-5 py-3 text-sm font-bold text-background">Go home</button></div></Shell>;
}

function Router() {
  return <Switch><Route path="/" component={HomePage} /><Route path="/shorts" component={ShortsPage} /><Route path="/upload" component={UploadPage} /><Route path="/search" component={SearchPage} /><Route path="/profile" component={ProfilePage} /><Route component={NotFoundPage} /></Switch>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><Router /></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;