export default {
  fetch(_request, env) {
    return Response.json({
      service: 'duas-rotas-rollback-drill',
      version: env.DRILL_VERSION,
    }, {
      headers: {'cache-control': 'no-store'},
    });
  },
};

