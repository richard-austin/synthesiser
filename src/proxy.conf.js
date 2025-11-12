const PROXY_CONFIG = [
  {  context: [
      "/assets/",
      "/stomp",
    ],
    target: "http://localhost:8080/",
    ws: true,
    changeOrigin: false,
    secure: false
  }
]

module.exports = PROXY_CONFIG;
