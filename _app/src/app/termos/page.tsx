import Link from 'next/link'
import { VVLogo } from '@/components/brand/vv-logo'

export const metadata = { title: 'Termos de Uso · Vitrine Virtual' }

export default function TermosPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface px-6 py-4">
        <Link href="/">
          <VVLogo />
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-serif text-4xl font-semibold">Termos de Uso</h1>
        <p className="mt-2 text-sm text-ink-3">Última atualização: 25/04/2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-2">
          <p>
            Ao usar a plataforma Vitrine Virtual, você concorda com os termos abaixo. Caso
            discorde, por favor não utilize o serviço.
          </p>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">1. O que oferecemos</h2>
            <p>
              Hospedagem de uma vitrine online para divulgação de peças de roupa, com recurso de
              provador virtual por inteligência artificial. O serviço é fornecido como está, sem
              garantia explícita de disponibilidade ou de qualidade do resultado da IA.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              2. Responsabilidades da lojista
            </h2>
            <p>
              Você é responsável pelo conteúdo cadastrado, pela veracidade das informações das
              peças, pela conformidade com leis trabalhistas e tributárias, e pelo atendimento ao
              cliente final.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              3. Conteúdo proibido
            </h2>
            <p>
              É proibido cadastrar peças com conteúdo ilegal, falsificações, ofensivas ou que
              violem direitos de terceiros. Detectado, o conteúdo é removido e a conta pode ser
              suspensa.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              4. Limites do provador virtual
            </h2>
            <p>
              O provador virtual gera uma simulação aproximada baseada em IA. O resultado pode
              divergir da realidade. A loja deve esclarecer ao cliente final que a peça real pode
              variar em caimento, cor e tamanho.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              5. Cancelamento e exclusão
            </h2>
            <p>
              Você pode pedir exclusão da conta a qualquer momento. Os dados são removidos
              conforme nossa{' '}
              <Link href="/privacidade" className="text-accent underline">
                política de privacidade
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
