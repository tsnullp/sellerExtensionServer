const request = require("request-promise-native")
const axios = require("axios")
const Cookie = require("../../models/Cookie")

exports.GetAliProduct = async ({ url }) => {
  try {
    const cookie = await Cookie.findOne({
      name: "xman_t",
    })

    const content = await request({
      // hostname: "aliexpress.com",
      url,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36",
        host: "aliexpress.com",
        origin: "https://ko.aliexpress.com/",
        referer: "https://ko.aliexpress.com/",
        // "Cookie": "aep_usuc_f=site=kor&c_tp=KRW&x_alimid=3585738017&isb=y&region=KR&b_locale=ko_KR;"
        // Cookie: `aep_usuc_f=site=kor&c_tp=KRW&x_alimid=3585738017&isb=y&region=KR&b_locale=ko_KR; xman_t=${cookie.cookie}`,
        Cookie: `ali_apache_id=33.1.216.181.1650545195661.189264.3; e_id=pt20; aep_common_f=FL8KeJly4gnybk0Qbh42dsAfse3hxy1hW9Pn4g51n8BdMwgeZ53QNQ==; account_v=1; af_ss_a=1; af_ss_b=1; _bl_uid=8mlCv2w8eyn5p73mI23suFFvpLXd; traffic_se_co=%7B%7D; cna=Uk0gGwiMCEQCAQ4EAmj5gKl4; _gcl_au=1.1.120188882.1658353284; sgcookie=E100E0PgH3xIMRt0%2FDrQR6fVPTuouT30WJ%2FcnncYwKePC1ntr83NmvI3lTQVjXaCqB9REHeo4JQKOoHFlbMrQ06iLPXhxyh8jpsv11FcufuZoUI%3D; xman_us_t=x_lid=kr1981385013uuvae&sign=y&rmb_pp=82-01030828659&x_user=exbPepAQaq4jiw1L8re0Wtty7K+MDpDw42sIt+x21NY=&ctoken=rqgb12qu19ii&need_popup=y&l_source=aliexpress; xman_f=/cEoL96yyG7WQV32fDN1GQx/fN191gKRE+gGHYIDBQd4iMVemGw/IC0A3kuelJTsPcpfU/LEUiVqhZHStKygQh4w0QmVlzVARg/ShCoqf9NJ89dd0LV3o/b1qz+MZr6UuQ1lVkvLsLZR+CoeSXasU88VL3dt/8/JjWFWs3MmShwmPr6nygDPPTl9qB0PGE8moX8AjgUHNeqxEB2txbyM6OljOdg1OWsEPTedv6JVZKsunF6T7qnlaGnj/jymEtVx72eMGECSDBjSE5t7OcBTUYtOz/Z9ryL47RvLOU0V3SYaFuWWMp8c/vVDO9u1DkGUftSBcw9zOA4=; aep_usuc_f=site=kor&c_tp=KRW&x_alimid=3585738017&isb=y&region=KR&b_locale=ko_KR; ali_apache_track=mt=1|ms=|mid=kr1981385013uuvae; _gid=GA1.2.1777788316.1658657764; XSRF-TOKEN=e75b71fd-aef5-4a03-ab70-823f537a2a8c; intl_locale=ko_KR; acs_usuc_t=x_csrf=4h72ipa4aq0f&acs_rt=d63e673cff4640248e1a0aa1fbccc5ff; xlly_s=1; ali_apache_tracktmp=W_signed=Y; RT="z=1&dm=aliexpress.com&si=a363a2ba-cc7f-4547-80b5-add85c266ccd&ss=l61fmrwb&sl=1&tt=1cr&rl=1&ld=1j4&ul=2uq&hd=2ut"; _m_h5_tk=c79a1117518c7f05de1fd1ede4a8270c_1658802948506; _m_h5_tk_enc=e4c68f12dc95379ae626b9c26abf4dce; AKA_A2=A; _gat=1; xman_us_f=x_locale=ko_KR&x_l=0&last_popup_time=1650545256690&x_user=KR|8659|user|ifm|3585738017&no_popup_today=n&x_lid=kr1981385013uuvae&x_c_chg=0&x_as_i=%7B%22aeuCID%22%3A%22e70cfb81a94a41c5b5ec2edbeec7eb63-1658802333261-09618-_vUNiZj%22%2C%22af%22%3A%225f979ce5d915b86bee3f7002%22%2C%22affiliateKey%22%3A%22_vUNiZj%22%2C%22channel%22%3A%22AFFILIATE%22%2C%22cv%22%3A%227%22%2C%22isCookieCache%22%3A%22N%22%2C%22ms%22%3A%221%22%2C%22pid%22%3A%22911063913%22%2C%22tagtime%22%3A1658802333261%7D&acs_rt=4d242bfd994b40a7b5cef1a7253642eb; aeu_cid=e70cfb81a94a41c5b5ec2edbeec7eb63-1658802333261-09618-_vUNiZj; _ga=GA1.1.2057416712.1650545199; aep_history=keywords%5E%0Akeywords%09%0A%0Aproduct_selloffer%5E%0Aproduct_selloffer%091005004206919630%091005002625032425%091005004275540495%091005003741783041%091005001351397600%091005002959757295%091005003557266156%091005002826963741; xman_t=${cookie.cookie}; JSESSIONID=A6646D1F85B5FC257D8904BEAED64AEA; intl_common_forever=tFAMEq4Dnm41PqZBIYozPrS761N+eogbZA2KSgVcyinnEtEm7g9EJQ==; _ga_VED1YSGNC7=GS1.1.1658800610.233.1.1658802352.0; isg=BBERTMfyF__PEkbEd254ymv7IBurfoXwFuU8w_OmDVj3mjHsO86VwL97PHZ8ph0o; tfstk=c-2OBbqwFMKtb9hSGlCngHNjKiblZCIt8OiyH-r8Sb7l5yJAiyyuekQy54LtpMC..; l=eB_Kh3j4jE2bC0GGBOfanurza77OSIRvmuPzaNbMiOCP_Q1B5H5NW6vht2T6C3MNhsXeR3P8n0-9BeYBcuE-nxvtP73nADMmn`,
      },
    })

    const temp = content.split("window.runParams = {")[1].trim().replace("data", `"data"`)
    // .replace("csrfToken", `"csrfToken"`)
    // .replace("abVersion", `"abVersion"`)
    // .replace("abtestMap", `"abtestMap"`)
    // .replace(/'/gi, `"`)
    const temp2 = temp.split("csrfToken")[0].trim()
    const temp3 = `{${temp2.slice(0, temp2.length - 1)}}`
    return JSON.parse(temp3)
  } catch (e) {
    console.log("GetAliProduct", e)
    return null
  }
}

exports.GetDetailHtml = async ({ url }) => {
  try {
    console.log("url", url)

    const content = await axios({
      url,
      method: "GET",
      responseType: "arraybuffer",
      headers: {
        Cookie: "aep_usuc_f=site=kor&c_tp=KRW&x_alimid=3585738017&isb=y&region=KR&b_locale=ko_KR;",
      },
    })
    // const content = await request({
    //   hostname: 'aliexpress.com',
    //   url,
    //   method: 'GET',
    //     headers: {
    //       "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36",
    //       "host": "aliexpress.com",
    //       "origin": "https://ko.aliexpress.com/",
    //     },
    //   })
    
    // console.log("content--->", content)
    return content.data.toString()
  } catch (e) {
    console.log("GetDetailHtml", e)
    return null
  }
}
