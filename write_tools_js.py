import pathlib

LAW_DB_CODE = """
// ─── 完整法律条文数据库 ─────────────────────────────────────────────────────────

const LAW_DATABASE = [
  // ════ 《民法典》租赁合同章 ════
  {id:'mft_703',law:'民法典',article:'第703条',title:'租赁合同定义',
   fullText:'租赁合同是出租人将租赁物交付承租人使用、收益，承租人支付租金的合同。',
   keywords:['租赁合同','出租人','承租人','租金','定义'],tags:['签约'],
   scene:'了解租赁合同的法律性质和基本权利义务',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_704',law:'民法典',article:'第704条',title:'租赁合同内容',
   fullText:'租赁合同的内容一般包括租赁物的名称、数量、用途、租赁期限、租金及其支付期限和方式、租赁物维修等条款。',
   keywords:['合同内容','租期','租金','维修','条款'],tags:['签约'],
   scene:'签订合同时检查合同是否包含必要条款',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_706',law:'民法典',article:'第706条',title:'未登记租赁合同效力',
   fullText:'当事人以租赁合同未经登记备案为由，请求认定合同无效的，人民法院不予支持。',
   keywords:['登记','备案','合同有效','未登记'],tags:['签约'],
   scene:'房东以合同未备案为由主张合同无效时',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_708',law:'民法典',article:'第708条',title:'出租人交付与维修义务',
   fullText:'出租人应当按照约定将租赁物交付承租人，并在租赁期限内保持租赁物符合约定的用途。',
   keywords:['维修','出租人义务','设施','交付','保持'],tags:['租住权益','维修'],
   scene:'水电暖气坏了房东拒绝维修时；设施不符合约定用途时',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_711',law:'民法典',article:'第711条',title:'承租人违约使用',
   fullText:'承租人未按照约定的方法或者未根据租赁物的性质使用租赁物，致使租赁物受到损失的，出租人可以解除合同并请求赔偿损失。',
   keywords:['违约使用','损失赔偿','解除合同','使用方法'],tags:['租住权益'],
   scene:'了解哪些情况属于违约使用，避免被追责',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_712',law:'民法典',article:'第712条',title:'出租人维修义务（法定）',
   fullText:'出租人应当履行租赁物的维修义务，但是当事人另有约定的除外。',
   keywords:['维修义务','出租人','设施损坏','修缮'],tags:['租住权益','维修'],
   scene:'房东以"合同约定租客自行维修"为由拒绝维修时',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_713',law:'民法典',article:'第713条',title:'自然损耗由出租人承担',
   fullText:'承租人在租赁期间，因不可归责于承租人的原因致使租赁物部分或者全部毁损、灭失的，承租人可以请求减少租金或者不支付租金；因租赁物部分或者全部毁损、灭失，致使不能实现合同目的的，承租人可以解除合同。承租人应当妥善保管租赁物，因保管不善造成租赁物毁损、灭失的，应当承担赔偿责任。租赁物的正常损耗，由出租人承担。',
   keywords:['自然损耗','正常磨损','押金','赔偿','墙壁','地板','电器','损耗'],tags:['押金纠纷','核心条款'],
   scene:'房东以墙壁发黄、地板磨损、电器老化等正常损耗为由扣押金时',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_714',law:'民法典',article:'第714条',title:'承租人保管义务',
   fullText:'承租人应当妥善保管租赁物，因保管不善造成租赁物毁损、灭失的，应当承担赔偿责任。',
   keywords:['保管义务','损坏赔偿','毁损','灭失'],tags:['押金纠纷','租住权益'],
   scene:'了解承租人的保管义务边界；房东主张人为损坏时的抗辩依据',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_716',law:'民法典',article:'第716条',title:'转租规则',
   fullText:'承租人经出租人同意，可以将租赁物转租给第三人。承租人转租的，承租人与出租人之间的租赁合同继续有效；第三人造成租赁物损失的，承租人应当赔偿损失。承租人未经出租人同意转租的，出租人可以解除合同。',
   keywords:['转租','二房东','同意','解除合同','第三人'],tags:['中介跑路','签约'],
   scene:'通过二房东租房押金纠纷；了解转租的法律条件',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_720',law:'民法典',article:'第720条',title:'租期内不得擅自涨租',
   fullText:'在租赁期限内，因占有、使用租赁物获得的收益，归承租人所有，但是当事人另有约定的除外。出租人不得在租赁期限内单方面提高租金。',
   keywords:['涨租','提高租金','租期','单方面','违约'],tags:['租住权益','核心条款'],
   scene:'租期内房东突然宣布涨租，威胁不涨就搬走时',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_721',law:'民法典',article:'第721条',title:'承租人支付租金义务',
   fullText:'承租人应当按照约定的期限支付租金。对支付期限没有约定或者约定不明确，依据本法第五百一十条的规定仍不能确定的，租赁期限不满一年的，应当在租赁期限届满时支付；租赁期限一年以上的，应当在每届满一年时支付，剩余期限不满一年的，应当在租赁期限届满时支付。',
   keywords:['支付租金','租金期限','按时缴租'],tags:['签约'],
   scene:'了解租金支付义务，避免因延迟付款引发纠纷',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_722',law:'民法典',article:'第722条',title:'欠租解除合同',
   fullText:'承租人无正当理由未支付或者迟延支付租金的，出租人可以请求承租人在合理期限内支付；承租人逾期不支付的，出租人可以解除合同。',
   keywords:['欠租','迟延支付','解除合同','催缴租金'],tags:['租住权益'],
   scene:'了解欠租风险；房东以欠租为由解除合同时的应对',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_724',law:'民法典',article:'第724条',title:'承租人法定解除权',
   fullText:'有下列情形之一，非因承租人原因致使租赁物无法使用的，承租人可以解除合同：（一）租赁物被司法机关或者行政机关依法查封、扣押；（二）租赁物权属不清晰；（三）租赁物具有影响承租人安全或者健康的瑕疵。',
   keywords:['解除合同','查封','权属不清','安全隐患','健康'],tags:['租住权益'],
   scene:'房屋存在安全隐患、被查封、权属不清时，租户有权解除合同',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_725',law:'民法典',article:'第725条',title:'买卖不破租赁',
   fullText:'租赁物在承租人按照租赁合同占有期限内发生所有权变动的，不影响租赁合同的效力。',
   keywords:['买卖不破租赁','卖房','房屋出售','所有权变动','驱逐'],tags:['租住权益','核心条款'],
   scene:'房东卖房要求租客立即搬走时；新房主要求驱逐时',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_726',law:'民法典',article:'第726条',title:'承租人优先购买权',
   fullText:'出租人出卖租赁房屋的，应当在出卖之前的合理期限内通知承租人，承租人享有以同等条件优先购买的权利；但是，房屋按份共有人行使优先购买权或者出租人将房屋出卖给近亲属的除外。',
   keywords:['优先购买权','卖房','通知','同等条件','近亲属'],tags:['租住权益'],
   scene:'房东出售房屋时，租客享有同等条件优先购买的权利',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_730',law:'民法典',article:'第730条',title:'不定期租赁随时解除',
   fullText:'当事人对租赁期限没有约定或者约定不明确，依据本法第五百一十条的规定仍不能确定的，视为不定期租赁；当事人可以随时解除合同，但是应当在合理期限之前通知对方。',
   keywords:['租期','不定期租赁','随时解除','通知期限'],tags:['签约','租住权益'],
   scene:'没有签书面合同或合同未约定租期时，了解权利义务',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  // ════ 《民法典》合同通则 ════
  {id:'mft_148',law:'民法典',article:'第148条',title:'欺诈撤销合同',
   fullText:'一方以欺诈手段，使对方在违背真实意思的情况下实施的民事法律行为，受欺诈方有权请求人民法院或者仲裁机构予以撤销。',
   keywords:['欺诈','撤销合同','虚假房源','违背真实意思'],tags:['签约陷阱','核心条款'],
   scene:'虚假房源骗签合同；照片与实物严重不符时',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_188',law:'民法典',article:'第188条',title:'诉讼时效3年',
   fullText:'向人民法院请求保护民事权利的诉讼时效期间为三年。法律另有规定的，依照其规定。诉讼时效期间自权利人知道或者应当知道权利受到损害以及义务人之日起计算。',
   keywords:['诉讼时效','3年','维权期限','起算','超期'],tags:['押金纠纷','维权程序'],
   scene:'提醒自己：押金纠纷、租房权益纠纷的维权期限为3年',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_496',law:'民法典',article:'第496条',title:'格式条款规则',
   fullText:'格式条款是当事人为了重复使用而预先拟定，并在订立合同时未与对方协商的条款。采用格式条款订立合同的，提供格式条款的一方应当遵循公平原则确定当事人之间的权利和义务，并采取合理的方式提示对方注意免除或者减轻其责任等与对方有重大利害关系的条款，按照对方的要求，对该条款予以说明。提供格式条款的一方未履行提示或者说明义务，致使对方没有注意或者理解与其有重大利害关系的条款的，对方可以主张该条款不成为合同的内容。',
   keywords:['格式条款','霸王条款','无效','提前退租','押金不退','合同陷阱'],tags:['押金纠纷','签约陷阱','核心条款'],
   scene:'合同中有"提前退租押金不退"等加重租户责任的格式条款时',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_497',law:'民法典',article:'第497条',title:'格式条款无效情形',
   fullText:'有下列情形之一的，该格式条款无效：（一）具有本法第一编第六章第三节和本法第五百零六条规定的无效情形；（二）提供格式条款一方不合理地免除或者减轻其责任、加重对方责任、限制对方主要权利；（三）提供格式条款一方排除对方主要权利。',
   keywords:['格式条款无效','加重责任','限制权利','排除权利'],tags:['签约陷阱'],
   scene:'合同中存在免除房东责任、加重租客责任的条款时',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_565',law:'民法典',article:'第565条',title:'解除合同通知',
   fullText:'当事人一方依法主张解除合同的，应当通知对方。合同自通知到达对方时解除；通知载明债务人在一定期限内不履行债务则合同自动解除，债务人在该期限内未履行债务的，合同自通知载明的期限届满时解除。',
   keywords:['解除合同','通知','书面通知','退租'],tags:['押金纠纷','租住权益'],
   scene:'退租时如何正式通知解除合同；保留书面退租证据',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_577',law:'民法典',article:'第577条',title:'违约责任',
   fullText:'当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。',
   keywords:['违约','违约责任','赔偿','拖延','不退押金'],tags:['押金纠纷','租住权益'],
   scene:'房东拖延不退押金；房东不履行维修义务时',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_583',law:'民法典',article:'第583条',title:'合同解除后损失赔偿',
   fullText:'当事人一方不履行合同义务或者履行合同义务不符合约定的，在履行义务或者采取补救措施后，对方还有其他损失的，应当赔偿损失。',
   keywords:['损失赔偿','合同解除','补偿','其他损失'],tags:['租住权益'],
   scene:'房东违约导致你提前搬走时，主张搬家费、差价等损失',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_585',law:'民法典',article:'第585条',title:'违约金过高可申请减少',
   fullText:'当事人可以约定一方违约时应当根据违约情况向对方支付一定数额的违约金，也可以约定因违约产生的损失赔偿额的计算方法。约定的违约金低于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以增加；约定的违约金过分高于造成的损失的，人民法院或者仲裁机构可以根据当事人的请求予以适当减少。',
   keywords:['违约金','过高','减少','提前退租','合理违约金'],tags:['押金纠纷'],
   scene:'合同约定的违约金（如没收全部押金）明显过高时，可申请法院减少',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_587',law:'民法典',article:'第587条',title:'押金与定金的区别',
   fullText:'债务人履行债务的，定金应当抵作价款或者收回。给付定金的一方不履行债务或者履行债务不符合约定，致使不能实现合同目的的，无权请求返还定金；收受定金的一方不履行债务或者履行债务不符合约定，致使不能实现合同目的的，应当双倍返还定金。',
   keywords:['定金','押金','双倍返还','区别','押金变定金'],tags:['押金纠纷','核心条款'],
   scene:'中介把押金写成"定金"试图不退；了解押金与定金的法律区别',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  {id:'mft_925',law:'民法典',article:'第925条',title:'受托人代理责任',
   fullText:'受托人以自己的名义，在委托人的授权范围内与第三人订立的合同，第三人在订立合同时知道受托人与委托人之间的代理关系的，该合同直接约束委托人和第三人；但是，有确切证据证明该合同只约束受托人和第三人的除外。',
   keywords:['中介','代理','委托','合同主体','房东责任'],tags:['中介跑路'],
   scene:'中介以自己名义收取押金后跑路，追究房东连带责任时',
   link:'https://flk.npc.gov.cn/detail2.html?MmM5MDlmZGQ2NzhiZjE3OTAxNjc4YmY0NzRjMTA4Mzk%3D'},
  // ════ 《消费者权益保护法》 ════
  {id:'xfz_8',law:'消费者权益保护法',article:'第8条',title:'消费者知情权',
   fullText:'消费者享有知悉其购买、使用的商品或者接受的服务的真实情况的权利。消费者有权根据商品或者服务的不同情况，要求经营者提供商品的价格、产地、生产者、用途、性能、规格、等级、主要成分、生产日期、有效期限、检验合格证明、使用方法说明书、售后服务，或者服务的内容、规格、费用等有关情况。',
   keywords:['知情权','真实情况','虚假房源','如实告知','信息披露'],tags:['签约陷阱','核心条款'],
   scene:'虚假房源、照片与实物不符；中介隐瞒房屋真实情况时',
   link:'https://flk.npc.gov.cn/detail2.html?ZmY4MDgxODE2ZjNjYmIzYzAxNmYzY2VlNjIxNzBiMzE%3D'},
  {id:'xfz_10',law:'消费者权益保护法',article:'第10条',title:'消费者公平交易权',
   fullText:'消费者享有公平交易的权利。消费者在购买商品或者接受服务时，有权获得质量保障、价格合理、计量正确等公平交易条件，有权拒绝经营者的强制交易行为。',
   keywords:['公平交易','强制交易','价格合理','拒绝','霸王条款'],tags:['签约陷阱'],
   scene:'中介强迫签不平等合同；强制收取不合理费用时',
   link:'https://flk.npc.gov.cn/detail2.html?ZmY4MDgxODE2ZjNjYmIzYzAxNmYzY2VlNjIxNzBiMzE%3D'},
  {id:'xfz_26',law:'消费者权益保护法',article:'第26条',title:'禁止不公平格式条款',
   fullText:'经营者在经营活动中使用格式条款的，应当以显著方式提请消费者注意商品或者服务的数量和质量、价款或者费用、履行期限和方式、安全注意事项和风险警示、售后服务、民事责任等与消费者有重大利害关系的内容，并按照消费者的要求予以说明。经营者不得以格式条款、通知、声明、店堂告示等方式，作出排除或者限制消费者权利、减轻或者免除经营者责任、加重消费者责任等对消费者不公平、不合理的规定，不得利用格式条款并借助技术手段强制交易。格式条款、通知、声明、店堂告示等含有前款所列内容的，其内容无效。',
   keywords:['格式条款','不公平','限制权利','加重责任','无效'],tags:['签约陷阱','核心条款'],
   scene:'合同中存在不公平格式条款；中介强制要求签署不合理声明时',
   link:'https://flk.npc.gov.cn/detail2.html?ZmY4MDgxODE2ZjNjYmIzYzAxNmYzY2VlNjIxNzBiMzE%3D'},
  {id:'xfz_55',law:'消费者权益保护法',article:'第55条',title:'欺诈三倍赔偿',
   fullText:'经营者提供商品或者服务有欺诈行为的，应当按照消费者的要求增加赔偿其受到的损失，增加赔偿的金额为消费者购买商品的价款或者接受服务的费用的三倍；增加赔偿的金额不足五百元的，为五百元。法律另有规定的，依照其规定。',
   keywords:['欺诈','三倍赔偿','惩罚性赔偿','虚假房源'],tags:['签约陷阱'],
   scene:'中介或房东存在欺诈行为时，可主张三倍赔偿',
   link:'https://flk.npc.gov.cn/detail2.html?ZmY4MDgxODE2ZjNjYmIzYzAxNmYzY2VlNjIxNzBiMzE%3D'},
  // ════ 《宪法》 ════
  {id:'xf_39',law:'宪法',article:'第39条',title:'住宅不受侵犯',
   fullText:'中华人民共和国公民的住宅不受侵犯。禁止非法搜查或者非法侵入公民的住宅。',
   keywords:['住宅不受侵犯','擅自进入','非法侵入','隐私','居住权'],tags:['租住权益','核心条款'],
   scene:'房东不打招呼直接进门；房东强行进入出租屋时',
   link:'https://flk.npc.gov.cn/detail2.html?ZmY4MDgxODE2NWRhNGI3ZTAxNWRhNGI3ZTAwMDAwMDE%3D'},
  // ════ 《治安管理处罚法》 ════
  {id:'za_40',law:'治安管理处罚法',article:'第40条',title:'非法侵入住宅处罚',
   fullText:'有下列行为之一的，处十日以上十五日以下拘留，并处五百元以上一千元以下罚款；情节较轻的，处五日以上十日以下拘留，并处二百元以上五百元以下罚款：……（三）非法侵入他人住宅的……',
   keywords:['非法侵入','住宅','拘留','罚款','擅自进入'],tags:['租住权益'],
   scene:'房东强行进入出租屋时，可向公安报案，房东将面临行政处罚',
   link:'https://flk.npc.gov.cn/'},
  // ════ 《城市房屋租赁管理办法》 ════
  {id:'czfl_6',law:'城市房屋租赁管理办法',article:'第6条',title:'出租房屋基本条件',
   fullText:'出租房屋，应当具备下列条件：（一）有合法的房屋所有权证书；（二）出租住宅用房，建筑结构和设施设备符合安全和卫生标准；（三）法律、法规规定的其他条件。',
   keywords:['出租条件','产权证','安全标准','卫生','合法出租'],tags:['签约'],
   scene:'验证房东是否有合法出租资格；房屋存在安全隐患时',
   link:'https://flk.npc.gov.cn/'},
  {id:'czfl_13',law:'城市房屋租赁管理办法',article:'第13条',title:'租赁合同必备内容',
   fullText:'房屋租赁，当事人双方应当签订租赁合同。租赁合同应当包括以下内容：（一）房屋租赁当事人的姓名（名称）和住所；（二）房屋的坐落、面积、结构、附属设施和设备状况；（三）租赁用途；（四）租赁期限；（五）租金数额、支付方式；（六）房屋维修责任；（七）房屋返还时的状态；（八）违约责任；（九）争议解决办法；（十）其他条款。',
   keywords:['合同内容','租赁合同','必备条款','面积','押金','违约责任'],tags:['签约'],
   scene:'签合同前检查合同是否包含所有必要条款',
   link:'https://flk.npc.gov.cn/'},
  // ════ 《民事诉讼法》 ════
  {id:'msss_162',law:'民事诉讼法',article:'第162条',title:'小额诉讼一审终审',
   fullText:'基层人民法院和它派出的法庭审理符合本法第一百六十二条规定的简单民事案件，标的额为各省、自治区、直辖市上年度就业人员年均工资收入30%以下的，实行一审终审。',
   keywords:['小额诉讼','一审终审','快速结案','低成本','起诉'],tags:['维权程序'],
   scene:'押金金额较小时，通过小额诉讼程序快速维权，费用低、周期短',
   link:'https://flk.npc.gov.cn/'},
];

// ─── 法律条文搜索功能 ─────────────────────────────────────────────────────────

let lawSearchTimeout = null;
let lawActiveTag = '';
let lawSearchQuery = '';

function initLawDatabase() {
  renderLawTagFilters();
  renderLawList(LAW_DATABASE);
  setupLawSearch();
}

function renderLawTagFilters() {
  const container = document.getElementById('law-tag-filters');
  if (!container) return;
  const allTags = new Set();
  LAW_DATABASE.forEach(law => law.tags.forEach(t => allTags.add(t)));
  const tagOrder = ['核心条款','押金纠纷','租住权益','签约陷阱','签约','中介跑路','维权程序'];
  const sortedTags = [...tagOrder.filter(t => allTags.has(t)), ...[...allTags].filter(t => !tagOrder.includes(t))];
  container.innerHTML = `
    <button class="law-tag-btn active" onclick="filterLawByTag(this,'')">全部 <span class="law-tag-count">${LAW_DATABASE.length}</span></button>
    ${sortedTags.map(tag => {
      const count = LAW_DATABASE.filter(l => l.tags.includes(tag)).length;
      return '<button class="law-tag-btn" onclick="filterLawByTag(this,\\'' + tag + '\\')">' + tag + ' <span class="law-tag-count">' + count + '</span></button>';
    }).join('')}`;
}

function filterLawByTag(el, tag) {
  lawActiveTag = tag;
  document.querySelectorAll('.law-tag-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  applyLawFilters();
}

function setupLawSearch() {
  const input = document.getElementById('law-search-input');
  if (!input) return;
  input.addEventListener('input', () => {
    clearTimeout(lawSearchTimeout);
    lawSearchTimeout = setTimeout(() => {
      lawSearchQuery = input.value.trim();
      applyLawFilters();
    }, 150);
  });
}

function applyLawFilters() {
  let results = LAW_DATABASE;
  if (lawActiveTag) results = results.filter(l => l.tags.includes(lawActiveTag));
  if (lawSearchQuery) {
    const q = lawSearchQuery.toLowerCase();
    results = results.filter(l =>
      l.title.toLowerCase().includes(q) || l.article.includes(q) || l.law.includes(q) ||
      l.fullText.toLowerCase().includes(q) || l.scene.toLowerCase().includes(q) ||
      l.keywords.some(k => k.includes(q))
    );
  }
  renderLawList(results);
  const el = document.getElementById('law-result-count');
  if (el) el.textContent = results.length + ' 条';
}

function renderLawList(laws) {
  const container = document.getElementById('law-db-list');
  if (!container) return;
  if (!laws.length) {
    container.innerHTML = '<div style="text-align:center;padding:48px 20px;color:var(--text-muted)"><div style="font-size:2.5rem;margin-bottom:12px">🔍</div><div style="font-weight:700;margin-bottom:6px">未找到相关条文</div><div style="font-size:0.85rem">试试其他关键词，如「押金」「维修」「涨租」</div></div>';
    return;
  }
  const grouped = {};
  laws.forEach(law => { if (!grouped[law.law]) grouped[law.law] = []; grouped[law.law].push(law); });
  const lawOrder = ['民法典','消费者权益保护法','宪法','治安管理处罚法','城市房屋租赁管理办法','不动产登记暂行条例','民事诉讼法'];
  const sortedLaws = [...lawOrder.filter(l => grouped[l]), ...Object.keys(grouped).filter(l => !lawOrder.includes(l))];
  const lawColors = {'民法典':'#1a56db','消费者权益保护法':'#059669','宪法':'#dc2626','治安管理处罚法':'#d97706','城市房屋租赁管理办法':'#7c3aed','不动产登记暂行条例':'#0891b2','民事诉讼法':'#be185d'};
  const q = lawSearchQuery.toLowerCase();
  container.innerHTML = sortedLaws.map(lawName => {
    const items = grouped[lawName];
    const color = lawColors[lawName] || '#64748b';
    return '<div class="law-group">' +
      '<div class="law-group-header" style="--law-color:' + color + '">' +
        '<span class="law-group-icon">⚖️</span>' +
        '<span class="law-group-name">《' + lawName + '》</span>' +
        '<span class="law-group-count">' + items.length + '条</span>' +
      '</div>' +
      '<div class="law-group-items">' +
        items.map(law =>
          '<div class="law-db-card">' +
            '<div class="law-db-card-header">' +
              '<div class="law-db-num" style="background:' + color + '15;color:' + color + ';border-color:' + color + '30">' + law.article + '</div>' +
              '<div class="law-db-title">' + hl(law.title, q) + '</div>' +
              '<div class="law-db-tags">' +
                law.tags.filter(t => t !== '核心条款').map(t => '<span class="law-db-tag">' + t + '</span>').join('') +
                (law.tags.includes('核心条款') ? '<span class="law-db-tag core">⭐ 核心</span>' : '') +
              '</div>' +
              '<a href="' + law.link + '" target="_blank" rel="noopener" class="law-db-link-btn">原文 ↗</a>' +
            '</div>' +
            '<div class="law-db-fulltext">' + hl(law.fullText, q) + '</div>' +
            '<div class="law-db-scene"><span class="law-db-scene-label">📌 适用场景</span>' + hl(law.scene, q) + '</div>' +
            (law.keywords.length ? '<div class="law-db-keywords">' + law.keywords.map(k => '<span class="law-kw' + (q && k.includes(q) ? ' matched' : '') + '">' + k + '</span>').join('') + '</div>' : '') +
          '</div>'
        ).join('') +
      '</div></div>';
  }).join('');
}

function hl(text, q) {
  if (!q) return text;
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + ')', 'gi');
  return text.replace(re, '<mark class="law-highlight">$1</mark>');
}

function copyTemplate() {
  const textarea = document.getElementById('template-content');
  const btn = document.getElementById('copy-template-btn');
  if (!textarea) return;
  navigator.clipboard.writeText(textarea.value).then(() => {
    if (btn) { btn.textContent = '已复制！'; btn.classList.add('copied'); setTimeout(() => { btn.textContent = '复制模板'; btn.classList.remove('copied'); }, 2000); }
  });
}
"""

p = pathlib.Path('d:/RJ/CatPawPJ/deposit-guardian/frontend/js/tools.js')
existing = p.read_text(encoding='utf-8')
lines = existing.splitlines()

# 找到 init 函数位置
init_idx = next((i for i, l in enumerate(lines) if l.strip().startswith('function init()')), None)

if init_idx is not None:
    before_init = '\n'.join(lines[:init_idx])
    new_init = """
// 初始化
function init() {
  renderLawCards();
  setupChecklist();
  setupTimeline();
  setupTemplates();
  initLawDatabase();
}
"""
    new_content = before_init + new_init + LAW_DB_CODE + "\ndocument.addEventListener('DOMContentLoaded', init);\n"
else:
    new_content = existing + LAW_DB_CODE

p.write_text(new_content, encoding='utf-8')
print('Written tools.js, size:', len(new_content), 'bytes')
print('LAW_DATABASE entries:', new_content.count("id:'mft_") + new_content.count("id:'xfz_") + new_content.count("id:'xf_") + new_content.count("id:'za_") + new_content.count("id:'czfl_") + new_content.count("id:'msss_"))
