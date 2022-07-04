module.exports = {
    apps : [{
      name        : "mad-wallet-stake",
      script      : "yarn && yarn start",
      watch       : false,
      merge_logs  : true,
      cwd         : "."

     },
     {
      name        : "mad-wallet-stake-schedule",
      script      : "yarn && yarn schedule",
      watch       : false,
      merge_logs  : true,
      cwd         : "."

     }
    ]
  }