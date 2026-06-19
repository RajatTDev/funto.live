const _0x37b75f = _0x4597;
function _0x4597(_0x363aa2, _0x53ad60) {
  _0x363aa2 = _0x363aa2 - (0x1 * -0x17e9 + -0x2405 + 0x3d7b * 0x1);
  const _0x55939b = _0x5a74();
  let _0x4c26f9 = _0x55939b[_0x363aa2];
  return _0x4c26f9;
}
function _0x5a74() {
  const _0x4e6352 = [
    "/profile",
    "../middlew",
    "/sendEmail",
    "282rTVZov",
    "../../chec",
    "updatePass",
    "./admin.co",
    "exports",
    "5540440yYcuxZ",
    "/multer",
    "2032PDptbN",
    "forgotPass",
    "/login",
    "986303KLuUSl",
    "are/admin.",
    "/signup",
    "rd/:adminI",
    "195258TbmgKS",
    "kAccess",
    "image",
    "Router",
    "/setPasswo",
    "multer",
    "../../util",
    "put",
    "updateImag",
    "260409DrIKct",
    "middleware",
    "setPasswor",
    "20GhETki",
    "word",
    "2626320oxaJnH",
    "express",
    "10809nwBJwK",
    "login",
    "ntroller",
    "/updateIma",
    "update",
    "store",
    "641850eNYFHy",
    "post",
    "getProfile",
    "get",
    "24fommxh",
    "patch",
    "single",
  ];
  _0x5a74 = function () {
    return _0x4e6352;
  };
  return _0x5a74();
}
(function (_0x431dfd, _0x1e109f) {
  const _0x2701f2 = _0x4597,
    _0x3a0533 = _0x431dfd();
  while (!![]) {
    try {
      const _0x230d03 =
        parseInt(_0x2701f2(0x18f)) / (-0x15be + 0x9 * 0x16d + 0x8ea * 0x1) +
        -parseInt(_0x2701f2(0x1a1)) / (0x1 * -0x2359 + 0x4d9 + 0x1e82) +
        (-parseInt(_0x2701f2(0x19c)) / (0x1c5 * -0xb + 0xc1 * -0x29 + 0x3263 * 0x1)) * (-parseInt(_0x2701f2(0x1ad)) / (-0xcfd + -0x3 * -0x942 + -0x1 * 0xec5)) +
        -parseInt(_0x2701f2(0x1b8)) / (-0x3cb * 0x2 + 0x230 + 0x56b) +
        (-parseInt(_0x2701f2(0x1b3)) / (-0x24fa + 0xdff * -0x1 + -0x1 * -0x32ff)) * (-parseInt(_0x2701f2(0x193)) / (-0x25f0 + 0x14ad + 0x114a)) +
        (parseInt(_0x2701f2(0x1ba)) / (-0xfb8 + -0x3 * -0xc9e + -0x161a)) * (parseInt(_0x2701f2(0x1a3)) / (-0x6a5 + 0xbbd + 0x5 * -0x103)) +
        (-parseInt(_0x2701f2(0x19f)) / (0x1fe1 + -0x147 * 0x12 + -0x97 * 0xf)) * (-parseInt(_0x2701f2(0x1a9)) / (0xe91 + -0x57a + 0xc1 * -0xc));
      if (_0x230d03 === _0x1e109f) break;
      else _0x3a0533["push"](_0x3a0533["shift"]());
    } catch (_0x22c077) {
      _0x3a0533["push"](_0x3a0533["shift"]());
    }
  }
})(_0x5a74, 0xf56b8 + -0x343d * -0x4c + -0x125aff);
const express = require(_0x37b75f(0x1a2)),
  router = express[_0x37b75f(0x196)](),
  multer = require(_0x37b75f(0x198)),
  { storage } = require(_0x37b75f(0x199) + _0x37b75f(0x1b9)),
  upload = multer({ storage: storage }),
  AdminController = require(_0x37b75f(0x1b6) + _0x37b75f(0x1a5)),
  AdminMiddleware = require(_0x37b75f(0x1b1) + _0x37b75f(0x190) + _0x37b75f(0x19d)),
  checkAccessWithKey = require(_0x37b75f(0x1b4) + _0x37b75f(0x194));
(router[_0x37b75f(0x1aa)](_0x37b75f(0x191), checkAccessWithKey(), AdminController[_0x37b75f(0x1a8)]),
  router[_0x37b75f(0x1aa)](_0x37b75f(0x18e), checkAccessWithKey(), AdminController[_0x37b75f(0x1a4)]),
  router[_0x37b75f(0x19a)]("/", AdminMiddleware, checkAccessWithKey(), AdminController[_0x37b75f(0x1b5) + _0x37b75f(0x1a0)]),
  router[_0x37b75f(0x1ae)]("/", AdminMiddleware, checkAccessWithKey(), AdminController[_0x37b75f(0x1a7)]),
  router[_0x37b75f(0x1ae)](_0x37b75f(0x1a6) + "ge", AdminMiddleware, checkAccessWithKey(), upload[_0x37b75f(0x1af)](_0x37b75f(0x195)), AdminController[_0x37b75f(0x19b) + "e"]),
  router[_0x37b75f(0x1ac)](_0x37b75f(0x1b0), AdminMiddleware, checkAccessWithKey(), AdminController[_0x37b75f(0x1ab)]),
  router[_0x37b75f(0x1aa)](_0x37b75f(0x1b2), AdminController[_0x37b75f(0x18d) + _0x37b75f(0x1a0)]),
  router[_0x37b75f(0x1aa)](_0x37b75f(0x197) + _0x37b75f(0x192) + "d", AdminMiddleware, checkAccessWithKey(), AdminController[_0x37b75f(0x19e) + "d"]),
  (module[_0x37b75f(0x1b7)] = router));
