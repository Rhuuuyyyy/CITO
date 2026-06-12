// ═══════════════════════════════════════════════════════════════════════
// FOTO STORE — armazenamento de fotos de pacientes em assets/uploads/
// ═══════════════════════════════════════════════════════════════════════
const FotoStore = {
  // Retorna a URL determinística da foto do paciente.
  // A existência é verificada pela img com onError.
  carregar(pacienteId) {
    return '/assets/uploads/paciente_' + pacienteId + '.jpg';
  },

  // Faz upload da foto para o backend (salva em assets/uploads/).
  async salvar(pacienteId, base64) {
    await api.uploadFotoPaciente(pacienteId, base64);
  },

  // Remove a foto do backend.
  async remover(pacienteId) {
    await api.deleteFotoPaciente(pacienteId);
  },
};
