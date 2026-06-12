// ═══════════════════════════════════════════════════════════════════════
// FOTO — componentes de avatar e captura de foto de paciente
// ═══════════════════════════════════════════════════════════════════════

// ── Modal de seleção/captura de foto ────────────────────────────────────
function ModalFotoCaptura({ pacienteId, nomeAtual, onSalvar, onClose }) {
  const [preview, setPreview] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef(null);

  function onFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function confirmar() {
    if (!preview) return;
    setSalvando(true);
    try {
      // Se pacienteId fornecido, faz upload imediato (edição de existente).
      // Se null (novo cadastro), o upload ocorre após a criação do paciente.
      if (pacienteId) {
        await FotoStore.salvar(pacienteId, preview);
      }
      onSalvar(preview);
    } catch (err) {
      alert('Não foi possível salvar a foto: ' + (err.message || 'erro'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 anim-fade-in"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>

      <div className="w-full max-w-sm rounded-3xl card-shadow anim-fade-up"
        style={{ background: 'var(--surface)', border: '1px solid var(--hair)' }}>

        <div className="flex items-center justify-between px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid var(--hair-soft)' }}>
          <div>
            <h2 className="font-display text-[20px] leading-none">Foto do paciente</h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>{nomeAtual}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center lift"
            style={{ border: '1px solid var(--hair)', color: 'var(--muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}>
            {Icon.x}
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Preview */}
          <div className="w-36 h-36 rounded-2xl mx-auto overflow-hidden flex items-center justify-center"
            style={{ border: '2px dashed var(--hair)', background: 'var(--paper-2)' }}>
            {preview
              ? <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              : <span className="text-[48px]" style={{ color: 'var(--hair)' }}>👤</span>
            }
          </div>

          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={onFileChange} />

          <button onClick={() => inputRef.current.click()}
            className="w-full py-3 rounded-2xl text-[13px] font-medium lift flex items-center justify-center gap-2"
            style={{ border: '1px dashed var(--hair)', color: 'var(--muted)', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--hair)'; e.currentTarget.style.color = 'var(--muted)'; }}>
            {Icon.plus} Selecionar imagem do dispositivo
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4"
          style={{ borderTop: '1px solid var(--hair-soft)' }}>
          <BtnGhost onClick={onClose}>Cancelar</BtnGhost>
          <BtnPrimary onClick={confirmar} disabled={!preview || salvando}>
            {salvando ? 'Salvando…' : <>{Icon.check} Usar esta foto</>}
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

// ── Avatar do paciente com suporte a edição ──────────────────────────────
function FotoAvatar({ pacienteId, nome, size = 48, editavel = false, onAtualizar }) {
  const [erro, setErro] = useState(false);
  const [ts, setTs]     = useState(Date.now()); // cache-buster pós-upload
  const [modalFoto, setModalFoto] = useState(false);

  const url = FotoStore.carregar(pacienteId) + '?t=' + ts;

  const iniciais = (nome || '?').trim()
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('');

  function aoSalvar(base64) {
    setErro(false);
    setTs(Date.now()); // força reload da img
    setModalFoto(false);
    if (onAtualizar) onAtualizar(base64);
  }

  return (
    <>
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        {!erro
          ? <img
              src={url}
              alt={nome}
              onError={() => setErro(true)}
              className="w-full h-full object-cover"
              style={{ borderRadius: Math.round(size * 0.35), border: '1px solid var(--hair)' }}
            />
          : <div
              className="flex items-center justify-center font-semibold"
              style={{
                width: size, height: size,
                borderRadius: Math.round(size * 0.35),
                background: 'var(--paper-2)',
                border: '1px solid var(--hair)',
                color: 'var(--muted)',
                fontSize: Math.round(size * 0.3),
              }}>
              {iniciais}
            </div>
        }

        {editavel && (
          <button
            onClick={() => setModalFoto(true)}
            title="Alterar foto"
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100"
            style={{
              borderRadius: Math.round(size * 0.35),
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              fontSize: Math.round(size * 0.28),
              transition: 'opacity 0.15s',
            }}>
            ✎
          </button>
        )}
      </div>

      {modalFoto && (
        <ModalFotoCaptura
          pacienteId={pacienteId}
          nomeAtual={nome}
          onSalvar={aoSalvar}
          onClose={() => setModalFoto(false)}
        />
      )}
    </>
  );
}
