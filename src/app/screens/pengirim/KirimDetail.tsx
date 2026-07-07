import React, { useState, useEffect } from 'react';
import { StepHeader } from '../../components/StepHeader';
import { CATEGORIES, PACKAGE_SIZES } from '../../../lib/mockData';

interface KirimDetailProps {
  navigate: (screen: string) => void;
  draftPackage: any;
  setDraftPackage: (pkg: any) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Makanan':    'restaurant',
  'Elektronik': 'devices',
  'Dokumen':    'description',
  'Pakaian':    'checkroom',
  'Lainnya':    'category',
};

const HANDLING_OPTIONS = [
  { key: 'Jaga dari Air',  icon: 'water_drop',          label: 'Jaga dari Air'  },
  { key: 'Mudah Pecah',    icon: 'crisis_alert',         label: 'Mudah Pecah'   },
  { key: 'Harus Tegak',    icon: 'vertical_align_top',   label: 'Harus Tegak'   },
  { key: 'Jaga Suhu',      icon: 'ac_unit',              label: 'Jaga Suhu'     },
];

const SIZE_DETAILS: Record<string, { sub: string; dims: string }> = {
  XS: { sub: 'Amplop / Dokumen',    dims: 'P:20 L:15 T:1cm · Max 0.5kg' },
  S:  { sub: 'Sepatu / Box Kecil',  dims: 'P:30 L:20 T:20cm · Max 2kg'  },
  M:  { sub: 'Tas / Peralatan',     dims: 'P:50 L:40 T:40cm · Max 10kg' },
  L:  { sub: 'Barang Rumah',        dims: 'P:80 L:60 T:60cm · Max 30kg' },
  XL: { sub: 'Kardus Besar',        dims: 'Butuh kendaraan roda empat'   },
};

export const KirimDetail: React.FC<KirimDetailProps> = ({
  navigate,
  draftPackage,
  setDraftPackage,
}) => {
  const [category, setCategory]     = useState(draftPackage.category || 'Dokumen');
  const [weightSize, setWeightSize] = useState<'XS'|'S'|'M'|'L'|'XL'>(draftPackage.weightSize || 'S');
  const [photoName, setPhotoName]   = useState(draftPackage.photoName || '');
  const [handling, setHandling]     = useState<string[]>(draftPackage.handling || []);
  const [description, setDescription] = useState(draftPackage.description || '');
  const [savePreset, setSavePreset] = useState(false);
  const [savedPresets, setSavedPresets] = useState<any[]>([]);

  useEffect(() => {
    const local = localStorage.getItem('kirimin_package_presets');
    if (local) {
      setSavedPresets(JSON.parse(local));
    } else {
      const defaults = [
        { id: 'p_1', category: 'Dokumen',  weightSize: 'XS', description: 'Surat Kontrak Kerja Penting', handling: ['Jaga dari Air'] },
        { id: 'p_2', category: 'Makanan',  weightSize: 'M',  description: 'Kue Ulang Tahun Coklat',      handling: ['Mudah Pecah', 'Jaga Suhu'] },
      ];
      setSavedPresets(defaults);
      localStorage.setItem('kirimin_package_presets', JSON.stringify(defaults));
    }
  }, []);

  const toggleHandling = (key: string) => {
    setHandling(h => h.includes(key) ? h.filter(x => x !== key) : [...h, key]);
  };

  const applyPreset = (preset: any) => {
    setCategory(preset.category);
    setWeightSize(preset.weightSize);
    setDescription(preset.description);
    setHandling(preset.handling || []);
    setPhotoName('preset_photo.jpg');
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = { ...draftPackage, category, weightSize, photoName: photoName || 'kirimin_item.jpg', handling, description };
    setDraftPackage(updated);

    if (savePreset) {
      const newPreset = { id: 'p_' + Date.now(), category, weightSize, description, handling };
      const list = [newPreset, ...savedPresets.slice(0, 4)];
      localStorage.setItem('kirimin_package_presets', JSON.stringify(list));
    }
    navigate('KirimRute');
  };

  const deletePreset = (id: string) => {
    const list = savedPresets.filter(p => p.id !== id);
    setSavedPresets(list);
    localStorage.setItem('kirimin_package_presets', JSON.stringify(list));
  };

  return (
    <div className="screen-content">
      {/* Header */}
      <div className="screen-header" style={{ margin: '-20px -20px 0 -20px' }}>
        <button onClick={() => navigate('Homepage')} className="back-pill">
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className="header-title" style={{ fontWeight: 700, fontSize: '17px' }}>Mau kirim apa hari ini?</h1>
      </div>

      {/* Step Indicator */}
      <StepHeader currentStep={1} />

      <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Kategori ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
            Kategori Barang <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {CATEGORIES.map(cat => {
              const active = category === cat;
              return (
                <div
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                    padding: '12px 4px', borderRadius: '14px', cursor: 'pointer',
                    border: `2px solid ${active ? '#2091e7' : '#e2e8f0'}`,
                    background: active ? '#e8f4ff' : '#ffffff',
                    transition: 'all 0.2s',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '24px', color: active ? '#2091e7' : '#94a3b8' }}>
                    {CATEGORY_ICONS[cat] ?? 'category'}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 600, color: active ? '#2091e7' : '#64748b', textAlign: 'center', lineHeight: 1.2 }}>
                    {cat}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Foto Paket ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
            Foto Paket <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div
            onClick={() => setPhotoName((p: string) => p ? '' : 'kirimin_upload_' + Math.round(Math.random() * 9999) + '.jpg')}
            style={{
              border: `2px dashed ${photoName ? '#2091e7' : '#cbd5e1'}`,
              borderRadius: '16px',
              padding: '28px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              background: photoName ? '#e8f4ff' : '#f8fafc',
              transition: 'all 0.2s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            }}
          >
            <span className="material-icons" style={{ fontSize: '36px', color: photoName ? '#2091e7' : '#94a3b8' }}>
              {photoName ? 'task_alt' : 'add_a_photo'}
            </span>
            <p style={{ fontSize: '13px', fontWeight: 600, color: photoName ? '#2091e7' : '#475569', margin: 0 }}>
              {photoName ? `✓ ${photoName}` : 'Ambil atau Unggah Foto'}
            </p>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
              {photoName ? 'Ketuk untuk hapus' : 'Format JPG/PNG • maks 5MB'}
            </span>
          </div>
        </div>

        {/* ── Ukuran Paket ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
            Ukuran Paket
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {PACKAGE_SIZES.map(sz => {
              const active = weightSize === sz.value;
              const detail = SIZE_DETAILS[sz.value];
              return (
                <div
                  key={sz.value}
                  onClick={() => setWeightSize(sz.value as 'XS'|'S'|'M'|'L'|'XL')}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    padding: '10px 4px', borderRadius: '14px', cursor: 'pointer',
                    border: `2px solid ${active ? '#2091e7' : '#e2e8f0'}`,
                    background: active ? '#2091e7' : '#ffffff',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 800, color: active ? '#ffffff' : '#334155' }}>
                    {sz.value}
                  </span>
                  <span style={{ fontSize: '8px', fontWeight: 500, color: active ? 'rgba(255,255,255,0.85)' : '#64748b', textAlign: 'center', lineHeight: 1.3 }}>
                    {detail?.sub ?? ''}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Dimension info */}
          <div style={{
            background: '#f0f4f9', borderRadius: '10px', padding: '8px 12px',
            fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span className="material-icons" style={{ fontSize: '14px', color: '#2091e7' }}>straighten</span>
            {SIZE_DETAILS[weightSize]?.dims}
          </div>
        </div>

        {/* ── Penanganan ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
            Peringatan Penanganan
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {HANDLING_OPTIONS.map(opt => {
              const active = handling.includes(opt.key);
              return (
                <div
                  key={opt.key}
                  onClick={() => toggleHandling(opt.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '20px', cursor: 'pointer',
                    border: `1.5px solid ${active ? '#2091e7' : '#e2e8f0'}`,
                    background: active ? '#2091e7' : '#ffffff',
                    color: active ? '#ffffff' : '#64748b',
                    fontSize: '12px', fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '16px' }}>{opt.icon}</span>
                  {opt.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Deskripsi ── */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
            Deskripsi Paket <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            placeholder="Tulis isi barang, instruksi khusus, atau informasi penting lainnya..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="form-textarea"
            rows={3}
            required
          />
        </div>

        {/* ── Save preset checkbox ── */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#475569' }}>
          <input
            type="checkbox"
            checked={savePreset}
            onChange={e => setSavePreset(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#2091e7' }}
          />
          Simpan sebagai preset cepat
        </label>

        <button type="submit" className="btn-primary">
          Lanjut
          <span className="material-icons">arrow_forward</span>
        </button>
      </form>

      {/* ── Preset List ── */}
      {savedPresets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
            ⚡ Gunakan Preset Cepat
          </span>
          {savedPresets.map((p, i) => (
            <div
              key={p.id || i}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: '16px',
                background: '#f8fafc', border: '1px solid #e2e8f0',
                transition: 'background 0.15s',
              }}
            >
              <div
                onClick={() => applyPreset(p)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, cursor: 'pointer' }}
              >
                <span className="material-icons" style={{ fontSize: '20px', color: '#2091e7' }}>
                  {CATEGORY_ICONS[p.category] ?? 'category'}
                </span>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                    [{p.weightSize}] {p.category}
                  </span>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                    {p.description.slice(0, 30)}...
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deletePreset(p.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '6px' }}
              >
                <span className="material-icons" style={{ fontSize: '18px', color: '#ef4444' }}>delete_outline</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default KirimDetail;
