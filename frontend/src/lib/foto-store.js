// ═══════════════════════════════════════════════════════════════════════
// FOTO STORE
// ═══════════════════════════════════════════════════════════════════════
const FotoStore = {
  carregar(pacienteId) {
    return '/assets/uploads/paciente_' + pacienteId + '.jpg';
  },

  async salvar(pacienteId, base64) {
    await api.uploadFotoPaciente(pacienteId, base64);
  },

  async remover(pacienteId) {
    await api.deleteFotoPaciente(pacienteId);
  },
};
