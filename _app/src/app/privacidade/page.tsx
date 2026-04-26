import Link from 'next/link'
import { VVLogo } from '@/components/brand/vv-logo'

export const metadata = { title: 'Política de Privacidade · Vitrine Virtual' }

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface px-6 py-4">
        <Link href="/">
          <VVLogo />
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-serif text-4xl font-semibold">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-ink-3">Última atualização: 25/04/2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-2">
          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              1. Quem somos
            </h2>
            <p>
              Vitrine Virtual é uma plataforma que permite a lojas de roupas divulgarem peças com
              um provador virtual por inteligência artificial. O controlador dos dados é{' '}
              <strong>[NOME / CNPJ DO CONTROLADOR — pendente]</strong>, contato:{' '}
              <strong>[E-MAIL — pendente]</strong>.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">2. Dados que coletamos</h2>
            <p>
              <strong>Da lojista:</strong> nome, e-mail (para autenticação), nome da loja,
              redes sociais e número de WhatsApp (que ela escolhe exibir publicamente), e fotos das
              peças cadastradas.
            </p>
            <p className="mt-3">
              <strong>Do cliente final (visitante da vitrine):</strong> apenas a foto enviada
              voluntariamente para o provador virtual e dados técnicos mínimos (timestamp e versão
              do navegador). Endereços IP são imediatamente convertidos em hash irreversível, usado
              apenas para limitar abuso. Não exigimos nem armazenamos cadastro do cliente final.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              3. A foto enviada para o provador virtual
            </h2>
            <p>
              <strong>A foto que você envia para experimentar uma peça não é armazenada.</strong>{' '}
              Ela vive apenas em memória durante o processamento, é enviada ao provedor de IA com
              opt-out de retenção, e é descartada imediatamente depois. O resultado gerado fica
              disponível por até 24h em uma URL temporária e expira automaticamente.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">4. Para que usamos</h2>
            <p>
              Os dados são usados exclusivamente para operar a plataforma: permitir login da
              lojista, exibir a vitrine pública, gerar o provador virtual sob demanda do cliente
              final e prevenir abuso da plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">5. Base legal (LGPD)</h2>
            <p>
              Para a foto do cliente final: <strong>consentimento explícito</strong>, coletado no
              momento do uso. Para os dados da lojista: execução de contrato. Para o hash de IP:
              legítimo interesse de prevenção a fraude.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              6. Seus direitos
            </h2>
            <p>
              Você pode solicitar a qualquer momento: acesso, correção, exclusão, portabilidade ou
              revogação de consentimento. Basta enviar e-mail para{' '}
              <strong>[E-MAIL — pendente]</strong>. Pedidos de exclusão são processados em até 15
              dias.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              7. Compartilhamento com terceiros
            </h2>
            <p>
              Usamos os seguintes processadores: Supabase (banco de dados e autenticação, hospedado
              na AWS), Vercel (hospedagem), FASHN.ai e Replicate (geração do provador virtual,
              ambos com retenção desligada para nossas requisições) e Cloudflare (proteção anti-
              abuso). Não vendemos nem compartilhamos dados para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">8. Retenção</h2>
            <p>
              Dados da lojista: enquanto a conta estiver ativa, e até 30 dias após exclusão da
              conta para fins legais. Foto do cliente final: zero (não é armazenada). Logs
              técnicos com hash de IP: 90 dias.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
