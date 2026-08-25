import React from 'react';
import { Download, Smartphone, ArrowRight, Shield } from 'lucide-react';
import { motion } from 'motion/react';

const DOWNLOAD_URL = import.meta.env.VITE_DOWNLOAD_APP_URL || '#';

export const DownloadAppSection: React.FC = () => {
  return (
    <section className="relative bg-gradient-to-br from-[#0F1D38] via-[#0A1628] to-[#060D1A] py-16 md:py-20 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#D98800]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-10 w-48 h-48 bg-[#F59E0B]/8 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-48 h-48 bg-[#D98800]/8 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left: Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1 text-center lg:text-left space-y-6"
          >
            <div className="inline-flex items-center gap-2 bg-[#D98800]/10 border border-[#D98800]/30 rounded-full px-4 py-1.5">
              <Smartphone className="w-4 h-4 text-[#D98800]" />
              <span className="text-xs font-bold text-[#D98800] uppercase tracking-wider">Download Now</span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#FFFFFF] leading-tight">
              Apna <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] to-[#D98800]">Kanooni Sahayak</span> Ab Aapke Pocket Mein
            </h2>

            <p className="text-base md:text-lg text-[#94A3B8] max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Mera Wakeel AI app download karein aur paayein instant legal consultation, AI case analysis, aur verified advocates se direct connect — kabhi bhi, kahin bhi.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <a
                href={DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 bg-gradient-to-r from-[#D98800] to-[#F59E0B] hover:from-[#C27900] hover:to-[#D98800] text-[#0F1D38] font-extrabold text-base px-8 py-4 rounded-2xl shadow-lg shadow-[#D98800]/25 hover:shadow-[#D98800]/40 transition-all duration-300 hover:scale-105"
              >
                <Download className="w-5 h-5" />
                <span>Download App</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                <Shield className="w-4 h-4 text-[#10B981]" />
                <span>100% Free &amp; Secure</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Phone Mockup / Feature Cards */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 w-full max-w-md lg:max-w-none"
          >
            <div className="relative">
              {/* Phone Mockup Frame */}
              <div className="mx-auto w-56 md:w-64 bg-[#1A1A2E] rounded-[2.5rem] p-3 shadow-2xl border border-[#D98800]/20">
                <div className="bg-gradient-to-b from-[#0F1D38] to-[#0A1628] rounded-[2rem] p-5 space-y-4 min-h-[380px] flex flex-col justify-center">
                  <div className="w-12 h-12 rounded-xl bg-[#D98800]/20 flex items-center justify-center mx-auto">
                    <span className="text-2xl">⚖️</span>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-extrabold text-[#F5A623]">Mera Wakeel AI</p>
                    <p className="text-[11px] text-[#94A3B8] leading-relaxed">Instant Legal Help in Your Language</p>
                  </div>
                  <div className="space-y-2">
                    {['AI Case Analysis', 'Verified Advocates', 'Document Scanner', '13 Languages'].map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 bg-[#FFFFFF]/5 rounded-lg px-3 py-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#D98800]" />
                        <span className="text-[10px] font-bold text-[#CBD5E1]">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating feature badges */}
              <div className="absolute -top-4 -right-2 md:right-0 bg-[#10B981] text-[#FFFFFF] text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-lg animate-bounce">
                Free Download
              </div>
              <div className="absolute -bottom-3 -left-2 md:-left-4 bg-[#D98800] text-[#0F1D38] text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-lg">
                13 Languages
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DownloadAppSection;
