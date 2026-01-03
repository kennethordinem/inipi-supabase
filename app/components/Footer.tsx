export function Footer() {
  return (
    <footer className="bg-gradient-to-b from-[#502B30] to-[#4a2329] text-amber-50 py-16 px-4 relative overflow-hidden">
      {/* Decorative Pattern */}
      <div className="absolute inset-0 opacity-5">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="footer-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="8" fill="none" stroke="white" strokeWidth="1" />
              <path d="M10,2 L10,18 M2,10 L18,10" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#footer-pattern)" />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto text-center relative z-10">
        {/* Decorative Top Element */}
        <div className="mb-6 flex justify-center">
          <svg width="60" height="40" viewBox="0 0 60 40" className="text-amber-200/40">
            <circle cx="30" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M15,20 L45,20 M30,5 L30,35" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        <h3 className="text-3xl font-bold mb-2 tracking-wider">INIPI</h3>
        <p className="text-amber-200/80 mb-8 text-lg italic">"Kom som du er, gå hjem som dig selv"</p>
        
        <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-amber-200/30 to-transparent mb-8" />
        
        <div className="flex flex-wrap justify-center gap-6 text-sm text-amber-100/80 mb-8">
          <a href="/" className="hover:text-amber-100 transition-colors">Hjem</a>
          <a href="/sessions" className="hover:text-amber-100 transition-colors">Gus Tider</a>
          <a href="/shop" className="hover:text-amber-100 transition-colors">Shop/Klippekort</a>
          <a href="/about" className="hover:text-amber-100 transition-colors">Om Os</a>
          <a href="/contact" className="hover:text-amber-100 transition-colors">Kontakt</a>
        </div>
        
        <div className="h-px w-full max-w-md mx-auto bg-gradient-to-r from-transparent via-amber-200/20 to-transparent mb-6" />
        
        <p className="text-amber-200/50 text-xs">
          © {new Date().getFullYear()} INIPI Amagerstrand. Alle rettigheder forbeholdes.
        </p>
      </div>
    </footer>
  );
}

