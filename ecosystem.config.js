module.exports = {
  apps: [
    {
      // pm2로 실행한 프로세스 목록에서 이 애플리케이션의 이름으로 지정될 문자열
      name: "Seller_Extension_Server",
      // pm2로 실행될 파일 경로
      script: "dist/index.js",
      watch: true,
      ignore_watch: ["node_modules", "log", "src/temp"],
      exec_interpreter: "babel-node",
      exec_mode: "fork",
      // 개발환경시 적용될 설정 지정
      env: {
        PORT: 4000,
        NODE_ENV: "development",
        name: "Defind_Server_dev"
      },
      // 배포환경시 적용될 설정 지정
      env_production: {
        PORT: 8080,
        NODE_ENV: "production",
        name: "Defind_Server_Prod"
      }
    }
  ]
}
