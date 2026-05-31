import type { ReactNode } from 'react'
import { JetBrains_Mono } from 'next/font/google'
import { notFound } from 'next/navigation'
import { CGH, GOLD_FOIL } from '@/components/themes/casa-gaby-harb/tokens'
import {
  Btn,
  Eyebrow,
  FF,
  GHMono,
  GoldRule,
  Icon,
  Wordmark,
} from '@/components/themes/casa-gaby-harb/atoms'
import { cghFontsClass } from '@/components/themes/casa-gaby-harb/fonts'
import { DocStyles } from './doc-styles'

export const metadata = {
  title: 'Casa Gaby Harb · Documentação Dev',
  robots: { index: false, follow: false },
}

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-cgh-mono',
  display: 'swap',
})

const MONO = 'var(--font-cgh-mono), "JetBrains Mono", ui-monospace, monospace'

/**
 * Documentação Dev / styleguide vivo do tema Casa Gaby Harb.
 *
 * Porte do handoff `Casa Gaby Harb - Documentação Dev.html` (+ cgh-doc/doc.css)
 * para uma rota in-app que renderiza os átomos REAIS do tema — então nunca
 * diverge do produto. Só-dev (igual /api-docs): não vaza pra produção.
 */
export default function CGHStyleguidePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <div className={`cgh-doc ${cghFontsClass} ${jetbrains.variable}`}>
      <DocStyles />
      <div className="shell">
        <DocSidebar />
        <main className="main">
          <DocHero />
          <SecCores />
          <SecTipografia />
          <SecTokens />
          <SecMarca />
          <SecBotoes />
          <SecIcones />
          <SecSuperficies />
          <SecMapa />
          <SecProvador />
          <SecAnalise />
          <SecResultado />
          <SecEstados />
          <SecResponsivo />
          <SecChangelog />
          <div className="foot">
            <GHMono size={30} />
            <p>Casa Gaby Harb · Vitrine Virtual · documentação de handoff · 30 mai 2026</p>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ── sidebar ────────────────────────────────────────────────────────────── */
const NAV_GROUPS: { head: string; items: { num: string; label: string; href: string }[] }[] = [
  {
    head: 'Fundamentos',
    items: [
      { num: '01', label: 'Cores', href: '#cores' },
      { num: '02', label: 'Tipografia', href: '#tipografia' },
      { num: '03', label: 'Espaço · raio · motion', href: '#tokens' },
    ],
  },
  {
    head: 'Componentes',
    items: [
      { num: '04', label: 'Marca & ornamentos', href: '#marca' },
      { num: '05', label: 'Botões', href: '#botoes' },
      { num: '06', label: 'Ícones', href: '#icones' },
      { num: '07', label: 'Superfícies & nav', href: '#superficies' },
    ],
  },
  {
    head: 'Telas & fluxos',
    items: [
      { num: '08', label: 'Mapa de telas', href: '#mapa' },
      { num: '09', label: 'Provador (espelho)', href: '#provador' },
      { num: '10', label: 'Análise da foto ✦', href: '#analise' },
      { num: '11', label: 'Resultado & avaliação ✦', href: '#resultado' },
      { num: '12', label: 'Estados & LGPD', href: '#estados' },
    ],
  },
  {
    head: 'Entrega',
    items: [
      { num: '13', label: 'Responsivo & a11y', href: '#responsivo' },
      { num: '14', label: 'Changelog', href: '#changelog' },
    ],
  },
]

function DocSidebar() {
  return (
    <aside className="side">
      <div className="brandline">
        <GHMono size={34} />
        <span className="brandcap">Casa Gaby&nbsp;Harb</span>
      </div>
      <p style={{ fontSize: 11, color: '#6b786d', lineHeight: 1.5, marginTop: 4 }}>
        Documentação de handoff
        <br />
        para desenvolvimento
      </p>
      {NAV_GROUPS.map((g) => (
        <div key={g.head}>
          <h4>{g.head}</h4>
          <nav>
            {g.items.map((it) => (
              <a key={it.href} href={it.href}>
                <span className="num">{it.num}</span>
                {it.label}
              </a>
            ))}
          </nav>
        </div>
      ))}
    </aside>
  )
}

/* ── hero ───────────────────────────────────────────────────────────────── */
const HERO_META: { dt: string; dd: string }[] = [
  { dt: 'Produto', dd: 'Vitrine Virtual' },
  { dt: 'Plataformas', dd: 'Desktop 1440 · Mobile 375' },
  { dt: 'Stack', dd: 'Next.js + React (tema CGH)' },
  { dt: 'Protótipo', dd: 'Casa Gaby Harb - Site.html' },
  { dt: 'Componentes', dd: 'themes/casa-gaby-harb/*' },
  { dt: 'Atualizado', dd: '30 mai 2026' },
]

function DocHero() {
  return (
    <header className="hero">
      <span className="eyebrow">Vitrine Virtual · handoff de engenharia</span>
      <h1>A casa, item por item — pronta para construir.</h1>
      <p className="lede">
        Tudo o que o desenvolvedor precisa para implementar a Vitrine Virtual da Casa Gaby Harb:
        tokens, componentes, telas e o comportamento de cada estado do espelho virtual.
      </p>
      <dl className="meta">
        {HERO_META.map((m) => (
          <div key={m.dt}>
            <dt>{m.dt}</dt>
            <dd>{m.dd}</dd>
          </div>
        ))}
      </dl>
    </header>
  )
}

/* ── helpers ────────────────────────────────────────────────────────────── */
function SecHead({ idx, title, hint }: { idx: string; title: string; hint: string }) {
  return (
    <div className="sec-head">
      <span className="idx">{idx}</span>
      <h2>{title}</h2>
      <p>{hint}</p>
    </div>
  )
}

function Swatch({ bg, nm, hx, role }: { bg: string; nm: string; hx: string; role: string }) {
  return (
    <div className="swatch">
      <div className="chip" style={{ background: bg }} />
      <div className="lbl">
        <div className="nm">{nm}</div>
        <div className="hx">{hx}</div>
        <div className="role">{role}</div>
      </div>
    </div>
  )
}

/* ── 01 cores ───────────────────────────────────────────────────────────── */
const GREENS = [
  { bg: '#1F3A2A', nm: 'musgo', hx: '#1F3A2A', role: 'fundo primário de marca' },
  { bg: '#2A4A35', nm: 'musgo2', hx: '#2A4A35', role: 'elevação / hover' },
  { bg: '#162a1f', nm: 'musgoDeep', hx: '#162a1f', role: 'loading / imersão' },
  { bg: '#0A0A0A', nm: 'ink', hx: '#0A0A0A', role: 'texto sobre creme' },
]
const GOLDS = [
  { bg: '#C9A961', nm: 'gold', hx: '#C9A961', role: 'acento / CTA primário' },
  { bg: '#E7CD8F', nm: 'goldHi', hx: '#E7CD8F', role: 'brilho do foil' },
  { bg: '#A6864A', nm: 'goldLo', hx: '#A6864A', role: 'sombra do foil' },
  { bg: GOLD_FOIL, nm: 'GOLD_FOIL', hx: 'linear-gradient 135°', role: 'monograma metálico' },
]
const CREAMS = [
  { bg: '#F5EFE6', nm: 'cream', hx: '#F5EFE6', role: 'fundo claro' },
  { bg: '#FBF7F0', nm: 'cream2', hx: '#FBF7F0', role: 'cartões' },
  { bg: '#EDE3D2', nm: 'cream3', hx: '#EDE3D2', role: 'placeholders' },
  { bg: '#D9C9A8', nm: 'areia', hx: '#D9C9A8', role: 'detalhe quente' },
]

function SecCores() {
  return (
    <section id="cores">
      <SecHead idx="01" title="Cores" hint="Verde musgo é o abraço · dourado pontua · creme respira" />
      <p className="lead">
        Três famílias governam a interface. <b>Verde musgo</b> é o DNA — fundo da maior parte das
        telas de marca. O <b>dourado</b> nunca preenche grandes áreas: é joia, usado em fios, ícones
        e no monograma. O <b>creme</b> é a tela onde a curadoria respira.
      </p>
      <div className="sub">Verdes — a casa</div>
      <div className="grid g4">
        {GREENS.map((c) => (
          <Swatch key={c.nm} {...c} />
        ))}
      </div>
      <div className="sub">Dourado — pontuação</div>
      <div className="grid g4">
        {GOLDS.map((c) => (
          <Swatch key={c.nm} {...c} />
        ))}
      </div>
      <div className="sub">Creme &amp; areia — respiro</div>
      <div className="grid g4">
        {CREAMS.map((c) => (
          <Swatch key={c.nm} {...c} />
        ))}
      </div>
      <div className="note">
        <span className="mk">✦</span>
        <p>
          <b>Texto sobre fundo escuro</b> usa opacidades fixas do creme, não cores novas:{' '}
          <code>onDarkMut = rgba(245,239,230,.62)</code> para apoio e{' '}
          <code>onDarkFaint = rgba(245,239,230,.34)</code> para legendas/LGPD. Acentos de campanha (
          <code>caramelo #B8763B</code>, <code>borgonha #6B1F1F</code>) são pontuais — nunca
          estruturais.
        </p>
      </div>
    </section>
  )
}

/* ── 02 tipografia ──────────────────────────────────────────────────────── */
function TypeRow({ name, children, spec }: { name: string; children: ReactNode; spec: string }) {
  return (
    <div className="typerow">
      <div className="name">{name}</div>
      <div className="demo">
        {children}
        <div style={{ fontSize: 11, color: CGH.musgo, opacity: 0.6, fontFamily: MONO, marginTop: 6 }}>
          {spec}
        </div>
      </div>
    </div>
  )
}

function SecTipografia() {
  return (
    <section id="tipografia">
      <SecHead idx="02" title="Tipografia" hint="Serif editorial em itálico · sans para a estrutura" />
      <p className="lead">
        Quatro famílias. <b>Cormorant Garamond itálico</b> carrega a voz da marca (títulos, falas).{' '}
        <b>Manrope</b> é a estrutura (navegação, botões, corpo). <b>Pinyon Script</b> existe só no
        monograma GH. <b>JetBrains Mono</b> marca legendas técnicas e overlines.
      </p>
      <div style={{ marginTop: 18 }}>
        <TypeRow
          name="Serif · Display"
          spec="Cormorant Garamond · italic 500 · 40–72px · line-height 1.02 · text-wrap balance"
        >
          <div
            style={{
              fontFamily: FF.serif,
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 46,
              color: CGH.musgo,
              lineHeight: 1,
            }}
          >
            Veja a peça vestida em <span style={{ color: CGH.gold }}>você</span>.
          </div>
        </TypeRow>
        <TypeRow name="Serif · Fala" spec="Cormorant Garamond · italic 400/500 · 17–23px">
          <div style={{ fontFamily: FF.serif, fontStyle: 'italic', fontSize: 23, color: '#46554a' }}>
            Envie uma foto sua, escolha a peça, e veja como fica em segundos.
          </div>
        </TypeRow>
        <TypeRow name="Sans · Corpo" spec="Manrope · 300/400/500/600/700 · 11–15px">
          <div style={{ fontSize: 15, color: '#3c4b41', maxWidth: 480, fontFamily: FF.sans }}>
            A estrutura usa Manrope: navegação, rótulos de peça, textos de apoio e microcopy. Peso
            300–700 conforme hierarquia.
          </div>
        </TypeRow>
        <TypeRow name="Sans · Botão / Nav" spec="Manrope · 500/600 · uppercase · letter-spacing .13em">
          <span
            style={{
              fontFamily: FF.sans,
              fontWeight: 600,
              fontSize: 12.5,
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              color: CGH.musgo,
            }}
          >
            Provar no espelho
          </span>
        </TypeRow>
        <TypeRow
          name="Mono · Overline"
          spec="JetBrains Mono · 9.5–11px · letter-spacing .14em · uppercase"
        >
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: CGH.musgo,
              opacity: 0.6,
            }}
          >
            validação rápida · sua foto em segurança
          </span>
        </TypeRow>
        <TypeRow
          name="Script · Monograma"
          spec="Pinyon Script · exclusivo do monograma, sob máscara de foil dourado"
        >
          <GHMono size={44} />
        </TypeRow>
      </div>
    </section>
  )
}

/* ── 03 tokens ──────────────────────────────────────────────────────────── */
function KvCard({ title, rows }: { title: string; rows: [string, ReactNode][] }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <dl className="kv">
        {rows.map(([k, v], i) => (
          <div key={i} style={{ display: 'contents' }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function SecTokens() {
  return (
    <section id="tokens">
      <SecHead idx="03" title="Espaço · raio · motion" hint="Constantes que mantêm o ritmo da casa" />
      <div className="grid g3">
        <KvCard
          title="Raios"
          rows={[
            ['Cartão', '10–16px'],
            ['Botão', '5px'],
            ['Pílula / FAB', '999px'],
            ['Moldura foto', '9px (interno) · 16px (foil)'],
            ['Dropzone arco', <code key="d">160px 160px 12px 12px</code>],
          ]}
        />
        <KvCard
          title="Espaçamento"
          rows={[
            ['Padding tela', 'desktop 64–72px · mobile 22–24px'],
            ['Gap seções', '40–80px'],
            ['Gap em listas', '12–18px'],
            ['Altura nav', '76–84px (desktop)'],
          ]}
        />
        <KvCard
          title="Motion"
          rows={[
            ['Saída/conforto', <code key="e">cubic-bezier(.22,1,.36,1)</code>],
            ['Fade padrão', '.4–.6s'],
            ['Spin (loading)', '2.6s linear infinite'],
            ['Pulse (monograma)', '1.8s ease-in-out'],
            ['Scan (análise)', '2.1s ease-in-out infinite'],
          ]}
        />
      </div>
      <div className="note">
        <span className="mk">✦</span>
        <p>
          <b>Movimento é discreto e luxuoso</b> — nada salta. Respeite{' '}
          <code>prefers-reduced-motion</code>: todas as animações decorativas caem para ~1ms. O
          dourado se move só como brilho (foil) ou varredura (scan), nunca piscando.
        </p>
      </div>
    </section>
  )
}

/* ── 04 marca ───────────────────────────────────────────────────────────── */
function SecMarca() {
  return (
    <section id="marca">
      <SecHead idx="04" title="Marca & ornamentos" hint="Os átomos que assinam a casa" />
      <div className="grid g2">
        <div className="card">
          <span className="tag">GHMono</span>
          <h3>Monograma GH</h3>
          <div
            style={{
              margin: '14px 0',
              background: CGH.musgoDeep,
              borderRadius: 8,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <GHMono size={64} />
          </div>
          <ul className="spec">
            <li>
              Pinyon Script sob <b>máscara de gradiente foil</b> (
              <code>background-clip:text</code>).
            </li>
            <li>
              Prop <b>size</b> controla tudo; usado de 22px (watermark) a 76px (loading).
            </li>
            <li>
              Fallback de cor: <code>gold</code> sólido onde o clip não aplica.
            </li>
          </ul>
        </div>
        <div className="card">
          <span className="tag">Wordmark</span>
          <h3>Lockup completo</h3>
          <div
            style={{
              margin: '14px 0',
              background: CGH.musgo,
              borderRadius: 8,
              padding: '30px 24px',
              textAlign: 'center',
            }}
          >
            <Wordmark color={CGH.cream} size={12} />
          </div>
          <ul className="spec">
            <li>
              Estrutura: <code>casa · GH · GABY HARB</code> em caps espaçados (.34em).
            </li>
            <li>
              Props: <b>color</b>, <b>size</b>, <b>mono</b> (mostra GH), <b>align</b>.
            </li>
          </ul>
        </div>
        <div className="card">
          <span className="tag">Eyebrow</span>
          <h3>Rótulo de seção</h3>
          <div style={{ margin: '14px 0', padding: '18px 0' }}>
            <Eyebrow color={CGH.goldLo}>O espelho virtual da Casa</Eyebrow>
          </div>
          <ul className="spec">
            <li>Fio dourado de 22px + caps .3em.</li>
            <li>
              Prop <b>center</b> centraliza o conjunto.
            </li>
          </ul>
        </div>
        <div className="card">
          <span className="tag">Floron · GoldRule</span>
          <h3>Divisores</h3>
          <div style={{ margin: '14px 0', padding: '18px 0' }}>
            <GoldRule floron opacity={0.4} />
          </div>
          <ul className="spec">
            <li>Losango entre dois fios — pontua quebras editoriais.</li>
            <li>
              <code>GoldRule</code> aceita <b>floron</b>, <b>opacity</b>, <b>width</b>.
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ── 05 botões ──────────────────────────────────────────────────────────── */
const BTN_VARIANTS: { nm: string; desc: string; gold?: boolean }[] = [
  { nm: 'gold', desc: 'CTA primário. Fundo dourado, texto musgoDeep.', gold: true },
  { nm: 'ghostDark', desc: 'Outline sobre fundo escuro. Ações secundárias.' },
  { nm: 'ghostLight', desc: 'Outline sobre creme. Catálogo / detalhe.' },
  { nm: 'WhatsBtn', desc: 'Atalho gold + ícone WhatsApp · "Falar com a Casa".' },
]

function SecBotoes() {
  return (
    <section id="botoes">
      <SecHead idx="05" title="Botões" hint="Um componente, quatro variantes" />
      <p className="lead">
        <code>Btn</code> centraliza todos: caps .13em, raio 5px. Props:{' '}
        <b>variant · icon · iconR · size</b> (sm/md/lg) <b>· full</b>. Quando passado só <b>icon</b>{' '}
        sem label, vira botão de ícone (usado no WhatsApp do resultado).
      </p>
      <div className="card" style={{ marginTop: 18 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'center',
            background: CGH.musgo,
            borderRadius: 9,
            padding: 24,
            marginBottom: 8,
          }}
        >
          <Btn variant="gold" icon="sparkle">
            Provar no espelho
          </Btn>
          <Btn variant="ghostDark" icon="share">
            Compartilhar
          </Btn>
          <Btn variant="gold" icon="whatsapp" ariaLabel="Falar com a Casa" style={{ padding: '13px 15px' }} />
        </div>
        <div className="grid g4" style={{ marginTop: 14 }}>
          {BTN_VARIANTS.map((v) => (
            <div key={v.nm}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: v.gold ? CGH.gold : CGH.musgo,
                  opacity: v.gold ? 1 : 0.55,
                }}
              >
                {v.nm}
              </div>
              <p style={{ fontSize: 12.5, color: '#41504a', marginTop: 5 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="note">
        <span className="mk">✦</span>
        <p>
          <b>Link minimalista</b> (não é botão): usado em "Provar outra peça" e "Saiba mais". Ícone
          pequeno + texto caps com <code>border-bottom</code> sutil. Sem moldura, cor{' '}
          <code>onDarkMut</code>.
        </p>
      </div>
    </section>
  )
}

/* ── 06 ícones ──────────────────────────────────────────────────────────── */
type DocIcon =
  | 'whatsapp'
  | 'share'
  | 'sparkle'
  | 'camera'
  | 'upload'
  | 'download'
  | 'shield'
  | 'refresh'
  | 'check'
  | 'scan'
  | 'ruler'
  | 'alert'
  | 'instagram'
  | 'bag'
  | 'bookmark'
  | 'pin'
  | 'chevR'
  | 'arrowR'

const ICONS: DocIcon[] = [
  'whatsapp', 'share', 'sparkle', 'camera', 'upload', 'download', 'shield', 'refresh',
  'check', 'scan', 'ruler', 'alert', 'instagram', 'bag', 'bookmark', 'pin', 'chevR', 'arrowR',
]
const NEW_ICONS = new Set<DocIcon>(['check', 'scan', 'ruler'])

function SecIcones() {
  return (
    <section id="icones">
      <SecHead idx="06" title="Ícones" hint="Linha fina de joalheria — 1.5px, cantos arredondados" />
      <p className="lead">
        Conjunto único <code>Icon name=…</code> em grid 24×24, traço 1.5px,{' '}
        <code>stroke-linecap/linejoin: round</code>. Props: <b>name · size · stroke · color</b>.
      </p>
      <div className="card" style={{ marginTop: 18 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))',
            gap: 18,
          }}
        >
          {ICONS.map((name) => {
            const isNew = NEW_ICONS.has(name)
            return (
              <div
                key={name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 9,
                  textAlign: 'center',
                }}
              >
                <Icon name={name} size={26} color={CGH.musgo} />
                <span style={{ fontFamily: MONO, fontSize: 10.5, color: isNew ? CGH.goldLo : '#5d6b60' }}>
                  {name}
                  {isNew ? ' ✦' : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="note">
        <span className="mk">✦</span>
        <p>
          <b>Novos nesta entrega:</b> <code>check</code>, <code>scan</code> e <code>ruler</code> —
          adicionados para a tela de análise da foto.
        </p>
      </div>
    </section>
  )
}

/* ── 07 superfícies ─────────────────────────────────────────────────────── */
function SecSuperficies() {
  return (
    <section id="superficies">
      <SecHead idx="07" title="Superfícies & navegação" hint="Placeholder, nav e o atalho da casa" />
      <div className="grid g3">
        <div className="card">
          <span className="tag">Ph</span>
          <h3>Placeholder editorial</h3>
          <div
            style={{
              margin: '12px 0',
              height: 120,
              borderRadius: 7,
              background:
                'repeating-linear-gradient(135deg,rgba(201,169,97,.07) 0 2px,transparent 2px 11px),#162a1f',
              boxShadow: 'inset 0 0 60px rgba(0,0,0,.4)',
            }}
          />
          <p>
            Imagem ausente: listras quentes 135° + legenda mono. <b>No produto, troca por &lt;img&gt;
            real.</b>
          </p>
        </div>
        <div className="card">
          <span className="tag">Nav</span>
          <h3>Barra superior</h3>
          <ul className="spec">
            <li>Altura 76px, wordmark à esquerda, menu à direita.</li>
            <li>
              Prop <b>theme</b>: <code>dark</code> (musgo) / <code>light</code> (creme).
            </li>
            <li>Itens: A curadoria · Coleções · A casa · Provador.</li>
            <li>Ações: Instagram + sacola.</li>
          </ul>
        </div>
        <div className="card">
          <span className="tag">WhatsFab</span>
          <h3>Atalho flutuante</h3>
          <div style={{ margin: '12px 0' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: CGH.gold,
                color: CGH.musgoDeep,
                padding: '11px 17px 11px 13px',
                borderRadius: 999,
                boxShadow: '0 10px 28px rgba(31,58,42,.3)',
              }}
            >
              <Icon name="whatsapp" size={18} stroke={1.6} color={CGH.musgoDeep} />
              <span
                style={{
                  fontFamily: FF.sans,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Falar com a Casa
              </span>
            </span>
          </div>
          <p>
            Canto inferior direito, presente em todas as telas públicas. WhatsApp é o checkout da
            casa.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ── 08 mapa ────────────────────────────────────────────────────────────── */
function SecMapa() {
  return (
    <section id="mapa">
      <SecHead idx="08" title="Mapa de telas" hint="O que existe, em desktop e mobile" />
      <p className="lead">
        No produto, a vitrine pública vive em <code>/v/[slug]</code> (CGHVitrinePage) e a ficha em{' '}
        <code>/v/[slug]/[peca]</code> (CGHPecaPage); o provador é o <code>CGHTryOnModal</code>.
      </p>
      <div className="grid g3" style={{ marginTop: 8 }}>
        <div className="card">
          <h3>Vitrine pública</h3>
          <ul className="spec">
            <li>
              <b>Hero / Home</b> — abraço em verde musgo.
            </li>
            <li>
              <b>A casa</b> — narrativa da marca.
            </li>
          </ul>
        </div>
        <div className="card">
          <h3>Curadoria</h3>
          <ul className="spec">
            <li>
              <b>Coleção</b> — grid editorial (creme).
            </li>
            <li>
              <b>Detalhe da peça</b> — ficha + cuidados.
            </li>
          </ul>
        </div>
        <div className="card">
          <span className="tag new">núcleo</span>
          <h3>Provador</h3>
          <ul className="spec">
            <li>
              <b>Intro / upload</b>
            </li>
            <li>
              <b>Análise da foto ✦</b>
            </li>
            <li>
              <b>Loading</b>
            </li>
            <li>
              <b>Resultado + avaliação ✦</b>
            </li>
          </ul>
        </div>
        <div className="card">
          <h3>Estados</h3>
          <ul className="spec">
            <li>
              <b>Erro amigável</b>
            </li>
            <li>
              <b>Privacidade · LGPD</b> (bottom sheet)
            </li>
          </ul>
        </div>
        <div className="card">
          <h3>Footer</h3>
          <ul className="spec">
            <li>Em musgoDeep, com wordmark e contatos.</li>
          </ul>
        </div>
        <div className="card">
          <h3>Catálogo de peças</h3>
          <ul className="spec">
            <li>Peças reais da loja, via Supabase (nome, preço, fotos, categoria).</li>
            <li>Paginação "Ver mais" + chips de categoria.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ── 09 provador ────────────────────────────────────────────────────────── */
function FlowStep({
  n,
  t,
  d,
  dark,
  accent,
  ping,
}: {
  n: string
  t: string
  d: string
  dark?: boolean
  accent?: boolean
  ping?: boolean
}) {
  return (
    <div className={`step${dark ? ' dark' : ''}${accent ? ' accent' : ''}`}>
      {ping ? <span className="ping">novo</span> : null}
      <span className="n">{n}</span>
      <div className="t">{t}</div>
      <div className="d">{d}</div>
    </div>
  )
}

function SecProvador() {
  return (
    <section id="provador">
      <SecHead
        idx="09"
        title="Provador · o espelho virtual"
        hint="O diferencial — quatro estados como momento de marca"
      />
      <p className="lead serif">O fluxo completo, da foto ao editorial pronto para o story.</p>
      <div className="flow">
        <FlowStep n="01 · INTRO" t="Envie sua foto" d="Dropzone em arco. Peça já escolhida. CTA &quot;Provar no espelho&quot;." />
        <span className="arrow">→</span>
        <FlowStep
          dark
          accent
          ping
          n="02 · ANÁLISE"
          t="Analisando sua foto"
          d="Validação rápida com varredura + checklist. ~2,8s."
        />
        <span className="arrow">→</span>
        <FlowStep dark n="03 · LOADING" t="Preparando o provador" d="Monograma pulsante + barra dourada." />
        <span className="arrow">→</span>
        <FlowStep
          accent
          ping
          n="04 · RESULTADO"
          t="Ficou para você"
          d="Editorial com marca d'água + avaliação &quot;Gostou?&quot;."
        />
      </div>
      <div className="grid g2" style={{ marginTop: 22 }}>
        <div className="card">
          <h3>01 · Intro / upload</h3>
          <ul className="spec">
            <li>
              Dropzone aceita <b>clique, seletor e arrastar</b> (<code>drag</code> destaca a borda).
            </li>
            <li>
              Aceita só <code>image/*</code>; checa consentimento LGPD antes de seguir.
            </li>
            <li>
              <b>Foto enviada:</b> exibida <b>inteira</b> (<code>object-fit:contain</code>, sem
              cortes) com faixa "Foto pronta · toque para trocar".
            </li>
            <li>Aviso LGPD com link "Saiba mais" → bottom sheet.</li>
            <li>
              Ao continuar, transiciona para <b>Análise</b>.
            </li>
          </ul>
        </div>
        <div className="card">
          <h3>03 · Loading</h3>
          <ul className="spec">
            <li>
              Fundo <code>musgoDeep</code>, wordmark no topo.
            </li>
            <li>
              Monograma com <b>pulse 1.8s</b> dentro de arco dourado em <b>spin 2.6s</b>.
            </li>
            <li>Fala: "Um momento — a curadoria está chegando até você."</li>
            <li>Barra fina determinada (foil) + overline "Preparando o provador".</li>
            <li>
              Ligado ao retorno <b>real</b> da FASHN (<code>/api/try-on</code>) — não é timer fake.
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ── 10 análise ─────────────────────────────────────────────────────────── */
function SecAnalise() {
  return (
    <section id="analise">
      <SecHead idx="10" title="Análise da foto ✦" hint="Novo estado — entre o upload e o loading" />
      <div className="callout">
        <span className="eyebrow">Adicionado nesta entrega</span>
        <h3>"Estamos olhando sua foto com cuidado."</h3>
        <p>
          Assim que a cliente envia a foto, entra uma validação informativa antes de seguir. Comunica
          que a imagem está sendo conferida e reforça a confiança (LGPD) — mantendo a linguagem da
          casa em vez de um spinner genérico.
        </p>
        <ul className="spec" style={{ marginTop: 14 }}>
          <li>
            <b>Gatilho:</b> upload concluído no Intro → <code>step = 'analyzing'</code>.
          </li>
          <li>
            <b>Visual:</b> a foto enviada com uma <b>linha de varredura dourada</b> (scan 2.1s) e{' '}
            <b>marcações de canto</b>; ao lado, título em serif itálico.
          </li>
          <li>
            <b>Checklist progressivo</b> (acende de cima para baixo): iluminação e nitidez →
            enquadramento → encontrando você na imagem → pronta para o espelho. Cada item vira ✓
            dourado ao concluir.
          </li>
          <li>
            <b>Timing:</b> um passo a cada <code>560ms</code>; total{' '}
            <code>560 × 4 + 520 ≈ 2.760ms</code>, então segue para o espelho.
          </li>
          <li>
            <b>Rodapé:</b> <code>shield</code> + "validação rápida · sua foto em segurança".
          </li>
          <li>
            <b>Integração real:</b> os passos são informativos; se a validação de qualidade reprovar,
            encaminha para o <b>Erro amigável</b> com a mensagem do gate.
          </li>
        </ul>
      </div>
      <div className="note">
        <span className="mk">✦</span>
        <p>
          <b>Acessibilidade:</b> anunciar a conclusão de cada passo via <code>aria-live="polite"</code>{' '}
          e dar à varredura um par estático sob <code>prefers-reduced-motion</code>. A validação é
          rápida, mas o estado existe para dar segurança — não esconda-o por completo.
        </p>
      </div>
    </section>
  )
}

/* ── 11 resultado ───────────────────────────────────────────────────────── */
function SecResultado() {
  return (
    <section id="resultado">
      <SecHead idx="11" title="Resultado & avaliação ✦" hint="O editorial pronto — e o retorno da cliente" />
      <div className="grid g2">
        <div className="card">
          <h3>04 · Resultado</h3>
          <ul className="spec">
            <li>Fundo musgo, título "Ficou para você."</li>
            <li>
              <b>Moldura foil</b> envolvendo a foto (<code>object-fit:contain</code>) com{' '}
              <b>marca d'água</b> GH + "casa gaby harb" no canto inferior esquerdo.
            </li>
            <li>
              <b>Download:</b> botão <b>só-ícone dourado</b> no <b>canto superior direito</b> da
              imagem (fundo translúcido + borda dourada).
            </li>
            <li>Legenda da peça: nome + preço.</li>
            <li>
              Ações: <b>Compartilhar</b> (ghost) + <b>WhatsApp só-ícone</b> (gold).
            </li>
            <li>
              <b>Provar outra peça</b> como link minimalista (não botão).
            </li>
          </ul>
        </div>
        <div className="card">
          <span className="tag new">novo</span>
          <h3>Avaliação "Gostou?"</h3>
          <div
            style={{
              margin: '14px 0',
              background: CGH.musgo,
              borderRadius: 9,
              padding: 22,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: FF.serif, fontStyle: 'italic', fontSize: 18, color: CGH.onDarkMut }}>
              Gostou?
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
              <span
                style={{
                  fontFamily: FF.sans,
                  fontSize: 13,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: CGH.cream,
                }}
              >
                Sim
              </span>
              <span style={{ width: 1, height: 14, background: 'rgba(201,169,97,0.4)' }} />
              <span
                style={{
                  fontFamily: FF.sans,
                  fontSize: 13,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: CGH.cream,
                }}
              >
                Não
              </span>
            </span>
          </div>
          <ul className="spec">
            <li>
              Estado: <code>rated = null | 'sim' | 'nao'</code>.
            </li>
            <li>
              Ao escolher, <b>todos os textos somem</b> (fade + slide-up,{' '}
              <code>.55s cubic-bezier(.22,1,.36,1)</code>, stagger 70ms) — a imagem permanece.
            </li>
            <li>
              Em seguida <b>entra o agradecimento</b> (delay .42s): floron + "Que bom que gostou."
              (Sim) ou "Obrigada pelo retorno." (Não).
            </li>
            <li>Resetado a cada nova geração do espelho.</li>
            <li>
              <b>Integração:</b> enviar o voto ao backend para curadoria/recomendação.
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ── 12 estados ─────────────────────────────────────────────────────────── */
function SecEstados() {
  return (
    <section id="estados">
      <SecHead idx="12" title="Estados & LGPD" hint="Erro com elegância · privacidade clara" />
      <div className="grid g2">
        <div className="card">
          <h3>Erro amigável</h3>
          <ul className="spec">
            <li>
              Tom de marca, sem stack técnica: ícone <code>alert</code> dourado + fala acolhedora.
            </li>
            <li>Ações: tentar novamente + falar com a casa (WhatsApp).</li>
            <li>
              Destino de falhas na <b>análise</b> ou no render do espelho.
            </li>
          </ul>
        </div>
        <div className="card">
          <h3>Privacidade · LGPD</h3>
          <ul className="spec">
            <li>Bottom sheet acionado por "Saiba mais".</li>
            <li>
              Texto-chave: <b>a foto é processada com segurança e descartada após o uso</b>.
            </li>
            <li>Reforçado também no estado de Análise (rodapé com escudo).</li>
            <li>Consentimento explícito (checkbox) exigido antes do envio — requisito legal.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ── 13 responsivo ──────────────────────────────────────────────────────── */
function SecResponsivo() {
  return (
    <section id="responsivo">
      <SecHead idx="13" title="Responsivo & acessibilidade" hint="Desktop 1440 · Mobile 375" />
      <div className="grid g2">
        <div className="card">
          <h3>Breakpoints & layout</h3>
          <ul className="spec">
            <li>
              <b>Desktop</b> 1440: provador em duas colunas (texto | cartão).
            </li>
            <li>
              <b>Mobile</b> 375: coluna única, <b>selfie como ação primária</b>, barras de ação fixas
              no rodapé.
            </li>
            <li>
              A maioria das clientes chega do <b>Instagram</b> — mobile é prioridade.
            </li>
            <li>
              Tamanhos clampados (<code>clamp()</code>) para escalar entre os extremos.
            </li>
          </ul>
        </div>
        <div className="card">
          <h3>Acessibilidade</h3>
          <ul className="spec">
            <li>Alvos de toque ≥ 44px.</li>
            <li>
              <code>aria-label</code> em botões de ícone (download, WhatsApp).
            </li>
            <li>
              <code>aria-live</code> no checklist de análise.
            </li>
            <li>
              Respeitar <code>prefers-reduced-motion</code> em scan, spin e pulse.
            </li>
            <li>Contraste: texto sobre musgo usa opacidades ≥ .62 do creme.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ── 14 changelog ───────────────────────────────────────────────────────── */
function SecChangelog() {
  return (
    <section id="changelog">
      <SecHead idx="14" title="Changelog desta entrega" hint="O que mudou desde a última spec" />
      <ul className="spec" style={{ maxWidth: 760 }}>
        <li>
          <b>+ Estado "Análise da foto"</b> no provador (desktop &amp; mobile): varredura dourada,
          checklist progressivo e reforço de LGPD. Novo passo entre upload e loading.
        </li>
        <li>
          <b>~ Upload:</b> a foto enviada passa a aparecer <b>inteira</b> (object-fit contain), sem
          cortes, com faixa "toque para trocar".
        </li>
        <li>
          <b>~ Resultado · download:</b> virou <b>botão só-ícone dourado no canto superior direito</b>{' '}
          da imagem; removido o botão de texto longo.
        </li>
        <li>
          <b>~ Resultado · ações:</b> WhatsApp agora é <b>só ícone</b>; "Provar outra peça" virou{' '}
          <b>link minimalista</b>.
        </li>
        <li>
          <b>+ Avaliação "Gostou? Sim/Não"</b> no resultado, com saída animada dos textos e
          agradecimento contextual.
        </li>
        <li>
          <b>+ Ícones</b> <code>check</code>, <code>scan</code>, <code>ruler</code> adicionados ao
          set; <code>Btn</code> ganhou <code>iconR</code>.
        </li>
      </ul>
    </section>
  )
}
