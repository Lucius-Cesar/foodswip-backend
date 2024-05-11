const checkEnvironment = (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    // Si en production, renvoyer une erreur 404 pour les routes sensibles
    return res.status(404).send("Not found.");
  }
  // Si en développement, passer au prochain middleware
  next();
};

module.exports = checkEnvironment;
