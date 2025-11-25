/**
 * PaymentForm Component
 * 
 * Allows users to send XLM payments
 * 
 * Features:
 * - Input for recipient address
 * - Input for amount
 * - Optional memo field
 * - Form validation
 * - Success message with transaction hash
 * - Error handling with user-friendly messages
 */

'use client';

import { useState } from 'react';
import { stellar } from '@/lib/stellar-helper';
import { FaPaperPlane, FaCheckCircle } from 'react-icons/fa';
import { Card, Input, Button, Alert } from './example-components';

interface PaymentFormProps {
  publicKey: string;
  onSuccess?: () => void;
}

export default function PaymentForm({ publicKey, onSuccess }: PaymentFormProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ recipient?: string; amount?: string }>({});
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [txHash, setTxHash] = useState('');

  const validateForm = (): boolean => {
    const newErrors: { recipient?: string; amount?: string } = {};

    // Validate recipient address
    if (!recipient.trim()) {
      newErrors.recipient = 'Alıcı adresi gereklidir';
    } else if (recipient.length !== 56 || !recipient.startsWith('G')) {
      newErrors.recipient = 'Geçersiz Stellar adresi (G ile başlamalı ve 56 karakter olmalı)';
    }

    // Validate amount
    if (!amount.trim()) {
      newErrors.amount = 'Miktar gereklidir';
    } else {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        newErrors.amount = 'Miktar pozitif bir sayı olmalıdır';
      } else if (numAmount < 0.0000001) {
        newErrors.amount = 'Miktar çok küçük (minimum: 0.0000001 XLM)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setAlert(null);
      setTxHash('');

      const result = await stellar.sendPayment({
        from: publicKey,
        to: recipient,
        amount: amount,
        memo: memo || undefined,
      });

      if (result.success) {
        setTxHash(result.hash);
        setAlert({
          type: 'success',
          message: `Ödeme başarıyla gönderildi! 🎉`,
        });
        
        // Clear form
        setRecipient('');
        setAmount('');
        setMemo('');
        setErrors({});

        // Call success callback
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      let errorMessage = 'Ödeme gönderilemedi. ';
      let solution = '';
      
      if (error.message?.includes('insufficient') || error.message?.includes('low reserve')) {
        errorMessage += 'Yetersiz bakiye.';
        solution = 'Hesabınızda en az 1 XLM rezerv bırakmanız gerekiyor.';
      } else if (error.message?.includes('destination') || error.message?.includes('not found') || error.message?.includes('404')) {
        errorMessage += 'Alıcı hesap bulunamadı.';
        solution = 'Alıcı hesap henüz oluşturulmamış. İlk ödeme için en az 1 XLM göndermeniz gerekiyor (hesap oluşturma ücreti).';
      } else if (error.message?.includes('invalid') || error.message?.includes('malformed')) {
        errorMessage += 'Geçersiz adres.';
        solution = 'Lütfen geçerli bir Stellar adresi girdiğinizden emin olun (G ile başlayan 56 karakter).';
      } else {
        errorMessage += error.message || 'Lütfen tekrar deneyin.';
      }

      setAlert({
        type: 'error',
        message: errorMessage + (solution ? `\n\n💡 ${solution}` : ''),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <FaPaperPlane className="text-blue-400" />
        Ödeme Gönder
      </h2>

      {alert && (
        <div className="mb-4">
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      {txHash && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <FaCheckCircle className="text-green-400 text-xl flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-green-400 font-semibold mb-2">İşlem Onaylandı!</p>
              <p className="text-white/70 text-sm mb-2">İşlem Hash:</p>
              <p className="text-white/90 text-xs font-mono break-all mb-3">{txHash}</p>
              <a
                href={stellar.getExplorerLink(txHash, 'tx')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Stellar Expert'te Görüntüle →
              </a>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-white/80 text-sm">Alıcı Adresi</label>
            <button
              type="button"
              onClick={() => {
                setRecipient(publicKey);
                setErrors({});
              }}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Kendi Adresime Gönder (Test)
            </button>
          </div>
          <input
            type="text"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value);
              setErrors({});
            }}
            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
          />
          {errors.recipient && <p className="text-red-400 text-sm mt-1">{errors.recipient}</p>}
        </div>

        <Input
          label="Miktar (XLM)"
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={setAmount}
          error={errors.amount}
        />

        <Input
          label="Not (Opsiyonel)"
          placeholder="Ödeme açıklaması..."
          value={memo}
          onChange={setMemo}
        />

        <div className="pt-2">
          <Button
            onClick={() => {}}
            variant="primary"
            disabled={loading}
            fullWidth
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
                Gönderiliyor...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <FaPaperPlane />
                Ödeme Gönder
              </span>
            )}
          </Button>
        </div>
      </form>

      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-blue-200/90 text-xs">
          ⚠️ <strong>Dikkat:</strong> Göndermeden önce alıcı adresini kontrol edin. Blockchain üzerindeki işlemler geri alınamaz!
        </p>
      </div>
    </Card>
  );
}

