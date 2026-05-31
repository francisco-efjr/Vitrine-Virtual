/**
 * Estilos do styleguide CGH — porte de `cgh-doc/doc.css`, escopado em
 * `.cgh-doc` para não vazar pro resto do app. Variáveis de fonte plugam nas
 * CSS vars do next/font (serif/sans/script/mono).
 */
export function DocStyles() {
  return (
    <style>{`
      html { scroll-behavior: smooth; }

      .cgh-doc {
        --musgo:#1F3A2A; --musgo2:#2A4A35; --musgoDeep:#162a1f;
        --gold:#C9A961; --goldHi:#E7CD8F; --goldLo:#A6864A;
        --ink:#0A0A0A; --cream:#F5EFE6; --cream2:#FBF7F0; --cream3:#EDE3D2; --areia:#D9C9A8;
        --caramelo:#B8763B; --borgonha:#6B1F1F;
        --mut:#5d6b60; --line:rgba(31,58,42,0.12); --line2:rgba(31,58,42,0.07);
        --serif: var(--font-cgh-serif), 'Cormorant Garamond', Georgia, serif;
        --sans: var(--font-cgh-sans), 'Manrope', ui-sans-serif, system-ui, sans-serif;
        --script: var(--font-cgh-script), 'Pinyon Script', cursive;
        --mono: var(--font-cgh-mono), 'JetBrains Mono', ui-monospace, monospace;
        --foil: linear-gradient(135deg, var(--goldLo) 0%, var(--goldHi) 38%, var(--gold) 62%, var(--goldLo) 100%);
        background: var(--cream);
        color: var(--ink);
        font-family: var(--sans);
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        min-height: 100vh;
      }
      .cgh-doc *, .cgh-doc *::before, .cgh-doc *::after { box-sizing: border-box; margin: 0; padding: 0; }

      /* layout */
      .cgh-doc .shell { display: grid; grid-template-columns: 264px 1fr; max-width: 1280px; margin: 0 auto; min-height: 100vh; }
      .cgh-doc .side { position: sticky; top: 0; align-self: start; height: 100vh; overflow-y: auto; padding: 38px 26px 40px; border-right: 1px solid var(--line); background: var(--cream2); }
      .cgh-doc .main { padding: 64px clamp(28px,5vw,84px) 120px; min-width: 0; }

      /* sidebar */
      .cgh-doc .brandline { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; }
      .cgh-doc .brandcap { font-size: 9.5px; font-weight: 300; letter-spacing: .32em; text-transform: uppercase; color: var(--musgo); }
      .cgh-doc .side h4 { font-family: var(--mono); font-size: 9.5px; letter-spacing: .18em; text-transform: uppercase; color: var(--mut); margin: 26px 0 10px; }
      .cgh-doc .side nav a { display: block; font-size: 13px; color: #3a4a3f; text-decoration: none; padding: 5px 0; border-bottom: 1px solid transparent; transition: color .15s; }
      .cgh-doc .side nav a:hover { color: var(--musgo); }
      .cgh-doc .side nav a .num { font-family: var(--mono); font-size: 10px; color: var(--gold); margin-right: 9px; }

      /* eyebrow */
      .cgh-doc .eyebrow { display: inline-flex; align-items: center; gap: 11px; font-weight: 500; font-size: 11px; letter-spacing: .3em; text-transform: uppercase; color: var(--goldLo); }
      .cgh-doc .eyebrow::before { content: ""; width: 22px; height: 1px; background: var(--gold); }

      /* hero */
      .cgh-doc .hero { display: flex; flex-direction: column; align-items: flex-start; }
      .cgh-doc .hero h1 { font-family: var(--serif); font-style: italic; font-weight: 500; font-size: clamp(38px,5.2vw,60px); line-height: 1.04; color: var(--musgo); margin: 16px 0 0; text-wrap: balance; }
      .cgh-doc .hero .lede { font-family: var(--serif); font-style: italic; font-size: clamp(18px,2.4vw,23px); color: #46554a; margin-top: 20px; max-width: 560px; }
      .cgh-doc .meta { width: 100%; display: flex; flex-wrap: wrap; gap: 10px 26px; margin-top: 30px; padding-top: 24px; border-top: 1px solid var(--line); }
      .cgh-doc .meta div { font-size: 12px; }
      .cgh-doc .meta dt { font-family: var(--mono); font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--mut); }
      .cgh-doc .meta dd { font-size: 13px; color: var(--musgo); margin-top: 3px; font-weight: 500; }

      /* section */
      .cgh-doc section { margin-top: 84px; scroll-margin-top: 24px; }
      .cgh-doc .sec-head { display: flex; align-items: baseline; gap: 16px; border-bottom: 1px solid var(--musgo); padding-bottom: 16px; margin-bottom: 30px; }
      .cgh-doc .sec-head .idx { font-family: var(--mono); font-size: 12px; color: var(--gold); }
      .cgh-doc .sec-head h2 { font-family: var(--serif); font-style: italic; font-weight: 500; font-size: clamp(28px,4vw,40px); color: var(--musgo); line-height: 1; }
      .cgh-doc .sec-head p { margin-left: auto; color: var(--mut); max-width: 340px; text-align: right; font-style: italic; font-family: var(--serif); font-size: 15px; }
      .cgh-doc .sub { font-family: var(--serif); font-style: italic; font-size: 22px; color: var(--musgo); margin: 38px 0 16px; display: flex; align-items: center; gap: 12px; }
      .cgh-doc .sub::after { content: ""; flex: 1; height: 1px; background: var(--line); }

      /* cards */
      .cgh-doc .grid { display: grid; gap: 18px; }
      .cgh-doc .g2 { grid-template-columns: repeat(2,1fr); }
      .cgh-doc .g3 { grid-template-columns: repeat(3,1fr); }
      .cgh-doc .g4 { grid-template-columns: repeat(4,1fr); }
      .cgh-doc .card { background: var(--cream2); border: 1px solid var(--line); border-radius: 10px; padding: 22px; position: relative; min-width: 0; }
      .cgh-doc .card h3 { font-family: var(--serif); font-style: italic; font-size: 21px; color: var(--musgo); margin-bottom: 4px; }
      .cgh-doc .card .tag { position: absolute; top: 16px; right: 16px; font-family: var(--mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: var(--gold); border: 1px solid rgba(201,169,97,.4); border-radius: 999px; padding: 3px 9px; }
      .cgh-doc .card p { font-size: 13.5px; color: #41504a; margin-top: 6px; }
      .cgh-doc .card .new { color: var(--musgoDeep); background: var(--gold); border-color: var(--gold); }
      .cgh-doc .lead { font-size: 15px; color: #3c4b41; max-width: 680px; margin-bottom: 8px; }
      .cgh-doc .lead.serif { font-family: var(--serif); font-style: italic; font-size: 19px; }

      .cgh-doc ul.spec { list-style: none; margin-top: 10px; display: flex; flex-direction: column; gap: 7px; }
      .cgh-doc ul.spec li { display: block; position: relative; padding-left: 15px; font-size: 13.5px; color: #3c4b41; line-height: 1.45; }
      .cgh-doc ul.spec li::before { content: ""; position: absolute; left: 0; top: 7px; width: 5px; height: 5px; border: 1px solid var(--gold); transform: rotate(45deg); }
      .cgh-doc ul.spec li b { color: var(--musgo); font-weight: 600; }

      .cgh-doc .kv { display: grid; grid-template-columns: auto 1fr; gap: 7px 18px; margin-top: 12px; font-size: 13px; }
      .cgh-doc .kv dt { font-family: var(--mono); font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--mut); }
      .cgh-doc .kv dd { color: var(--musgo); }
      .cgh-doc code, .cgh-doc .mono { font-family: var(--mono); font-size: 12px; background: rgba(31,58,42,.06); padding: 1.5px 6px; border-radius: 4px; color: var(--musgoDeep); overflow-wrap: anywhere; }

      /* colour & type specimens */
      .cgh-doc .swatch { border-radius: 9px; overflow: hidden; border: 1px solid var(--line); }
      .cgh-doc .swatch .chip { height: 78px; }
      .cgh-doc .swatch .lbl { padding: 10px 12px; background: var(--cream2); }
      .cgh-doc .swatch .lbl .nm { font-size: 13px; font-weight: 600; color: var(--musgo); }
      .cgh-doc .swatch .lbl .hx { font-family: var(--mono); font-size: 11px; color: var(--mut); margin-top: 2px; }
      .cgh-doc .swatch .lbl .role { font-size: 11px; color: #5d6b60; font-style: italic; margin-top: 4px; }

      .cgh-doc .typerow { display: flex; align-items: baseline; gap: 20px; padding: 16px 0; border-bottom: 1px solid var(--line2); }
      .cgh-doc .typerow .name { flex-shrink: 0; width: 150px; font-family: var(--mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--mut); }
      .cgh-doc .typerow .demo { flex: 1; }

      /* flow diagram */
      .cgh-doc .flow { display: flex; align-items: stretch; gap: 0; flex-wrap: wrap; margin-top: 8px; }
      .cgh-doc .flow .step { flex: 1; min-width: 150px; background: var(--musgo); color: var(--cream); border-radius: 10px; padding: 18px 16px; position: relative; }
      .cgh-doc .flow .step.dark { background: var(--musgoDeep); }
      .cgh-doc .flow .step.accent { outline: 2px solid var(--gold); outline-offset: 2px; }
      .cgh-doc .flow .step .n { font-family: var(--mono); font-size: 10px; letter-spacing: .16em; color: var(--gold); }
      .cgh-doc .flow .step .t { font-family: var(--serif); font-style: italic; font-size: 19px; margin-top: 6px; color: var(--cream); }
      .cgh-doc .flow .step .d { font-size: 11.5px; color: rgba(245,239,230,.62); margin-top: 6px; line-height: 1.45; }
      .cgh-doc .flow .arrow { align-self: center; color: var(--gold); font-size: 20px; padding: 0 10px; flex-shrink: 0; }
      .cgh-doc .flow .step .ping { position: absolute; top: 14px; right: 14px; font-family: var(--mono); font-size: 8px; letter-spacing: .1em; text-transform: uppercase; background: var(--gold); color: var(--musgoDeep); border-radius: 999px; padding: 2px 7px; font-weight: 600; }

      .cgh-doc .note { display: flex; gap: 13px; background: rgba(201,169,97,.1); border: 1px solid rgba(201,169,97,.34); border-radius: 9px; padding: 15px 17px; margin-top: 18px; }
      .cgh-doc .note .mk { font-family: var(--script); font-size: 26px; line-height: .7; color: var(--goldLo); flex-shrink: 0; }
      .cgh-doc .note p { font-size: 13.5px; color: #3c4b41; }
      .cgh-doc .note b { color: var(--musgo); }

      .cgh-doc .callout { background: var(--musgo); color: var(--cream); border-radius: 12px; padding: 26px 28px; margin-top: 18px; }
      .cgh-doc .callout .eyebrow { color: var(--gold); }
      .cgh-doc .callout .eyebrow::before { background: var(--gold); }
      .cgh-doc .callout h3 { font-family: var(--serif); font-style: italic; font-size: 24px; margin: 12px 0 8px; color: var(--cream); }
      .cgh-doc .callout p { font-size: 14px; color: rgba(245,239,230,.78); max-width: 640px; }
      .cgh-doc .callout ul.spec li { color: rgba(245,239,230,.82); }
      .cgh-doc .callout ul.spec li b { color: var(--cream); }
      .cgh-doc .callout code { background: rgba(245,239,230,.12); color: var(--goldHi); }

      .cgh-doc .foot { margin-top: 90px; padding-top: 26px; border-top: 1px solid var(--musgo); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
      .cgh-doc .foot p { font-size: 12px; color: var(--mut); }

      @media (max-width: 880px) {
        .cgh-doc .shell { grid-template-columns: 1fr; }
        .cgh-doc .side { display: none; }
        .cgh-doc .g2, .cgh-doc .g3, .cgh-doc .g4 { grid-template-columns: 1fr; }
        .cgh-doc .sec-head p { display: none; }
      }
    `}</style>
  )
}
