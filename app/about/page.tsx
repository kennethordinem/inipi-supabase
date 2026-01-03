import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#faf8f5]">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#502B30] to-[#5e3023] text-amber-100 py-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-wide">
              Om INIPI
            </h1>
            <p className="text-xl text-amber-100/90">
              Din autentiske saunagus oplevelse
            </p>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 mb-8 border border-[#502B30]/10">
              <h2 className="text-3xl font-bold text-[#502B30] mb-6">
                Hvad er INIPI?
              </h2>
              <p className="text-lg text-[#4a2329]/90 mb-4 leading-relaxed">
                INIPI er dit sted for autentiske saunagus oplevelser. Vi kombinerer traditioner 
                med moderne komfort for at skabe en unik og helbredende oplevelse.
              </p>
              <p className="text-lg text-[#4a2329]/90 leading-relaxed">
                Vores erfarne gusmestre guider dig gennem hver session med omhu og omsorg, 
                hvor varme, damp, dufte og ritualer skaber en dyb afslapning af krop og sind.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 mb-8 border border-[#502B30]/10">
              <h2 className="text-3xl font-bold text-[#502B30] mb-6">
                Vores Historie
              </h2>
              <p className="text-lg text-[#4a2329]/90 mb-4 leading-relaxed">
                INIPI startede med en vision om at bringe den autentiske saunagus oplevelse 
                til Danmark. Inspireret af gamle traditioner har vi skabt et moderne wellness-center 
                hvor du kan opleve kraften i varmen og fællesskabet.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-sm shadow-lg p-8 border border-[#502B30]/10">
              <h2 className="text-3xl font-bold text-[#502B30] mb-6">
                Vores Værdier
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-4xl mb-3">🔥</div>
                  <h3 className="text-xl font-semibold text-[#502B30] mb-2">
                    Autenticitet
                  </h3>
                  <p className="text-[#4a2329]/80">
                    Vi holder fast i traditionerne og skaber ægte oplevelser
                  </p>
                </div>
                <div>
                  <div className="text-4xl mb-3">🤝</div>
                  <h3 className="text-xl font-semibold text-[#502B30] mb-2">
                    Fællesskab
                  </h3>
                  <p className="text-[#4a2329]/80">
                    Vi skaber trygge rammer for samvær og afslapning
                  </p>
                </div>
                <div>
                  <div className="text-4xl mb-3">💚</div>
                  <h3 className="text-xl font-semibold text-[#502B30] mb-2">
                    Velvære
                  </h3>
                  <p className="text-[#4a2329]/80">
                    Dit helbred og trivsel er vores højeste prioritet
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-[#502B30] text-amber-100">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 tracking-wide">
              Klar til at opleve INIPI?
            </h2>
            <p className="text-xl mb-8 text-amber-100/90">
              Book din første saunagus og oplev forskellen
            </p>
            <a 
              href="/sessions" 
              className="inline-block bg-white text-[#502B30] px-8 py-4 rounded-sm text-lg font-semibold hover:bg-amber-50 transition-colors shadow-lg"
            >
              Se Gus Tider
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

