import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Send, Sparkles, X, Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { Product, Shop } from '../types';

interface VoiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  shops: Shop[];
  products: Product[];
  onOrderParsed: (parsedData: {
    shopId?: string;
    items: { productId: string; quantity: number }[];
    paidAmount?: number;
    paymentMethod?: any;
    notes?: string;
  }) => void;
}

export const VoiceOrderModal: React.FC<VoiceOrderModalProps> = ({
  isOpen,
  onClose,
  shops,
  products,
  onOrderParsed,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thoughts, setThoughts] = useState<string | null>(null);
  const [showThoughts, setShowThoughts] = useState(false);

  // Quick preset sample sentences for testing
  const samplePrompts = [
    'মেসার্স ভাই ভাই জেনারেল স্টোরে ২ কার্টুন রূপচাঁদা তেল এবং ৩ ডজন লাক্স সাবান অর্ডার কাটো।',
    'আল্লাহর দান স্টোর, ৫ কার্টুন তীর আটা ও ১ বস্তা ফ্রেশ চিনি, নগদ ৫০০০ টাকা দিয়েছে।',
    'জননী এন্টারপ্রাইজ ৩ কার্টুন ড্যানিশ দুধ ও ২ কার্টুন হুইল পাউডার বাকীতে অর্ডার নিয়েছে।',
  ];

  const handleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('আপনার ব্রাউজারে সরাসরি ভয়েস রিকগনিশন সাপোর্ট নেই। অনুগ্রহ করে নিচের বক্সে লিখে দিন।');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'bn-BD'; // Bengali
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech error:', event);
        setIsListening(false);
        setError('ভয়েস শনাক্ত করা যায়নি। লিখে ইনপুট দিন।');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);
    setThoughts(null);

    try {
      const res = await fetch('/api/ai/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textInput: inputText,
          shops,
          products,
        }),
      });

      if (!res.ok) {
        throw new Error('অর্ডার পার্স করতে সমস্যা হয়েছে');
      }

      const data = await res.json();
      const parsed = data.parsedOrder;
      setThoughts(data.thoughts || null);

      // Match shop
      let matchedShopId: string | undefined = undefined;
      if (parsed.shopName) {
        const found = shops.find(
          (s) =>
            s.name.toLowerCase().includes(parsed.shopName.toLowerCase()) ||
            parsed.shopName.toLowerCase().includes(s.name.toLowerCase())
        );
        if (found) matchedShopId = found.id;
      }

      // Match items
      const matchedItems: { productId: string; quantity: number }[] = [];
      if (Array.isArray(parsed.items)) {
        for (const item of parsed.items) {
          const itemText = (item.productName || '').toLowerCase();
          const p = products.find(
            (prod) =>
              prod.name.toLowerCase().includes(itemText) ||
              prod.banglaName.toLowerCase().includes(itemText) ||
              itemText.includes(prod.name.toLowerCase()) ||
              itemText.includes(prod.banglaName.toLowerCase()) ||
              prod.category.toLowerCase().includes(itemText)
          );
          if (p) {
            matchedItems.push({
              productId: p.id,
              quantity: Math.max(1, Number(item.quantity) || 1),
            });
          }
        }
      }

      if (matchedItems.length === 0 && !matchedShopId) {
        setError('অর্ডারে কোনো পণ্য বা দোকান শনাক্ত করা সম্ভব হয়নি। অনুগ্রহ করে স্পষ্ট করে লিখুন।');
        return;
      }

      onOrderParsed({
        shopId: matchedShopId,
        items: matchedItems,
        paidAmount: parsed.paidAmount,
        paymentMethod: parsed.paymentMethod,
        notes: parsed.specialNotes || parsed.tradeOffer,
      });

      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'অর্ডার প্রসেসিং ব্যর্থ হয়েছে');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">এআই ভয়েস ও কুইক অর্ডার</h3>
              <p className="text-xs text-emerald-200/90">কথা বলে বা লিখে দ্রুত পণ্যের অর্ডার তৈরি করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {/* Bengali helper instruction */}
          <div className="text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/80">
            💡 <span className="font-semibold text-neutral-800">উদাহরণ:</span> দোকানের নাম, পণ্যের নাম, পরিমাণ ও টাকা একসাথে লিখুন বা মাইকে বলুন। যেমন: <em>&quot;ভাই ভাই স্টোর ২ কার্টুন রূপচাঁদা তেল আর ৩ ডজন সাবান&quot;</em>
          </div>

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              নমুনা অর্ডার (ক্লিক করে টেস্ট করুন):
            </span>
            <div className="flex flex-col gap-1.5">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(prompt)}
                  className="text-left text-xs bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 px-3 py-2 rounded-lg border border-emerald-200 transition-colors truncate"
                >
                  &quot;{prompt}&quot;
                </button>
              ))}
            </div>
          </div>

          {/* Input & Voice Controls */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="এখানে বলুন বা টাইপ করুন... (যেমন: আল্লাহর দান স্টোর ৩ কার্টুন তেল, নগদে ২০০০ টাকা)"
                rows={3}
                className="w-full text-sm p-3 pr-12 rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent resize-none text-neutral-900 placeholder:text-neutral-400"
              />
              <button
                type="button"
                onClick={handleSpeechRecognition}
                className={`absolute right-2.5 bottom-3.5 p-2 rounded-xl transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                }`}
                title={isListening ? 'শুনছি...' : 'ভয়েসে বলতে ক্লিক করুন'}
              >
                {isListening ? <Mic className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>

            {isListening && (
              <div className="flex items-center gap-2 text-xs font-medium text-rose-600 animate-pulse bg-rose-50 p-2 rounded-lg border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                মাইক্রোফোন চালু আছে, পরিষ্কারভাবে অর্ডারটি বলুন...
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {thoughts && (
              <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-2.5 text-xs text-purple-900">
                <button
                  type="button"
                  onClick={() => setShowThoughts(!showThoughts)}
                  className="flex items-center gap-1.5 font-semibold text-purple-800"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Gemini 3.1 Pro থিংকিং প্রসেস</span>
                  <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.2 rounded-full">
                    {showThoughts ? 'লুকান' : 'দেখুন'}
                  </span>
                </button>
                {showThoughts && (
                  <div className="mt-2 p-2 bg-white rounded-lg border border-purple-100 font-mono text-[11px] max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {thoughts}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-emerald-200" />
                    <span>বিশ্লেষণ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>কার্টে যোগ করুন</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
