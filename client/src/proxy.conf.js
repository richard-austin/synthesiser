const PROXY_CONFIG = [
  {
    context: [
      "/syn"
    ],
    target: "http://localhost:8080/",
    changeOrigin: false,
    secure: false
  }
]

module.exports = PROXY_CONFIG;
