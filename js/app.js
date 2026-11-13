// A Quiet Place with God - scripts
const $ = id => document.getElementById(id);
const FIELDS = {bible:2, calendar:3, prayers:3, worship:2, notes:2};
const REQ = {bible:[0,1], calendar:[1,2], prayers:[0], worship:[1], notes:[0,1]};
const NAMES = {bible:'study', calendar:'devotion', prayers:'prayer', worship:'song', notes:'note'};
const DRAFTS = ['bible1','bible2','calendar1','calendar2','calendar3','prayers1','prayers2','prayers3','worship1','worship2','notes1','notes2','sp-q'];
const USERNAME = /^[\p{L}\p{N}._-]{3,20}$/u;

// ---- Browser storage helpers (nothing leaves this browser) ----
const LS = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del: k => { try { localStorage.removeItem(k); } catch (e) {} }
};
let uid = null;
const idOf = u => u.id || u.name.toLowerCase();
const users = () => { try { return JSON.parse(LS.get('qp_users')) || []; } catch (e) { return []; } };
const saveUsers = u => LS.set('qp_users', JSON.stringify(u));
const byName = n => users().find(u => u.name.toLowerCase() === String(n).trim().toLowerCase());
const me = () => users().find(u => idOf(u) === uid);
const update = fn => { const all = users(); fn(all.find(x => idOf(x) === uid)); return saveUsers(all); };
const key = k => 'qp:' + uid + ':' + k;
const hash = async (id, p) => [...new Uint8Array(await crypto.subtle.digest('SHA-256',
  new TextEncoder().encode(id.toLowerCase() + ':' + p)))].map(b => b.toString(16).padStart(2, '0')).join('');
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fmt = d => { if (!d) return ''; const x = new Date(d + 'T00:00:00'); return isNaN(x) ? d : x.toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'}); };

// ---- Pages ----
function showPage(page, button) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  $(page).classList.add('active');
  button.classList.add('active');
  if (page === 'settings') refreshSettings();
  window.scrollTo({top:0, behavior:'smooth'});
}

// ---- Bible: KJV and BBE are public domain, so their text is bundled in /data. NIV, ESV, NLT, NKJV are copyrighted, so they open on BibleGateway ----
const BOOKS = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];
const RAW = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/', JSD = 'https://cdn.jsdelivr.net/gh/thiagobodruk/bible@master/json/';
const BUNDLED = {KJV:['data/kjv.json', RAW + 'en_kjv.json', JSD + 'en_kjv.json'], BBE:['data/bbe.json', RAW + 'en_bbe.json', JSD + 'en_bbe.json']};
const VOTD_DATA = [["Micah",7,7,0,"Therefore I will look unto the LORD ; I will wait for the God of my salvation: my God will hear me."],["Colossians",3,2,0,"Set your affection on things above, not on things on the earth."],["Luke",18,27,0,"And he said, The things which are impossible with men are possible with God."],["James",4,10,0,"Humble yourselves in the sight of the Lord, and he shall lift you up."],["Galatians",5,14,0,"For all the law is fulfilled in one word, even in this; Thou shalt love thy neighbour as thyself."],["Matthew",19,26,0,"But Jesus beheld them , and said unto them, With men this is impossible; but with God all things are possible."],["Psalms",4,8,0,"I will both lay me down in peace, and sleep: for thou, LORD , only makest me dwell in safety."],["1 John",1,9,0,"If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness."],["1 Peter",5,1,0,"The elders which are among you I exhort, who am also an elder, and a witness of the sufferings of Christ, and also a partaker of the glory that shall be revealed:"],["Psalms",62,12,0,"Also unto thee, O Lord, belongeth mercy: for thou renderest to every man according to his work."],["1 John",5,6,0,"This is he that came by water and blood, even Jesus Christ; not by water only, but by water and blood. And it is the Spirit that beareth witness, because the Spirit is truth."],["James",1,22,0,"But be ye doers of the word, and not hearers only, deceiving your own selves."],["Romans",8,25,0,"But if we hope for that we see not, then do we with patience wait for it ."],["2 Timothy",3,16,0,"All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness:"],["Psalms",30,9,0,"What profit is there in my blood, when I go down to the pit? Shall the dust praise thee? shall it declare thy truth?"],["Mark",10,27,0,"And Jesus looking upon them saith, With men it is impossible, but not with God: for with God all things are possible."],["Romans",12,12,0,"Rejoicing in hope; patient in tribulation; continuing instant in prayer;"],["John",8,32,0,"And ye shall know the truth, and the truth shall make you free."],["James",2,22,0,"Seest thou how faith wrought with his works, and by works was faith made perfect?"],["Psalms",46,10,0,"Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth."],["Romans",12,15,0,"Rejoice with them that do rejoice, and weep with them that weep."],["Ezekiel",36,26,0,"A new heart also will I give you, and a new spirit will I put within you: and I will take away the stony heart out of your flesh, and I will give you an heart of flesh."],["Mark",9,23,0,"Jesus said unto him, If thou canst believe, all things are possible to him that believeth."],["1 John",4,7,8,"Beloved, let us love one another: for love is of God; and every one that loveth is born of God, and knoweth God. He that loveth not knoweth not God; for God is love."],["Proverbs",11,30,0,"The fruit of the righteous is a tree of life; and he that winneth souls is wise."],["Psalms",25,20,0,"O keep my soul, and deliver me: let me not be ashamed; for I put my trust in thee."],["Psalms",34,8,0,"O taste and see that the LORD is good: blessed is the man that trusteth in him."],["1 John",5,14,0,"And this is the confidence that we have in him, that, if we ask any thing according to his will, he heareth us:"],["Psalms",95,8,0,"Harden not your heart, as in the provocation, and as in the day of temptation in the wilderness:"],["Proverbs",22,17,0,"Bow down thine ear, and hear the words of the wise, and apply thine heart unto my knowledge."],["John",14,6,0,"Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me."],["Hebrews",11,6,0,"But without faith it is impossible to please him : for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him."],["Philippians",4,13,0,"I can do all things through Christ which strengtheneth me."],["Proverbs",3,1,0,"My son, forget not my law; but let thine heart keep my commandments:"],["Jeremiah",29,13,0,"And ye shall seek me, and find me , when ye shall search for me with all your heart."],["Proverbs",4,11,0,"I have taught thee in the way of wisdom; I have led thee in right paths."],["Proverbs",16,3,0,"Commit thy works unto the LORD , and thy thoughts shall be established."],["Jeremiah",33,3,0,"Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not."],["Psalms",27,14,0,"Wait on the LORD : be of good courage, and he shall strengthen thine heart: wait, I say, on the LORD ."],["Isaiah",43,4,0,"Since thou wast precious in my sight, thou hast been honourable, and I have loved thee: therefore will I give men for thee, and people for thy life."],["Ephesians",3,7,0,"Whereof I was made a minister, according to the gift of the grace of God given unto me by the effectual working of his power."],["Romans",12,1,2,"I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service. And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God."],["Genesis",28,15,0,"And, behold, I am with thee, and will keep thee in all places whither thou goest, and will bring thee again into this land; for I will not leave thee, until I have done that which I have spoken to thee of."],["Romans",15,17,0,"I have therefore whereof I may glory through Jesus Christ in those things which pertain to God."],["Psalms",42,11,0,"Why art thou cast down, O my soul? and why art thou disquieted within me? hope thou in God: for I shall yet praise him, who is the health of my countenance, and my God."],["Nehemiah",8,10,0,"Then he said unto them, Go your way, eat the fat, and drink the sweet, and send portions unto them for whom nothing is prepared: for this day is holy unto our Lord: neither be ye sorry; for the joy of the LORD is your strength."],["Psalms",42,4,0,"When I remember these things , I pour out my soul in me: for I had gone with the multitude, I went with them to the house of God, with the voice of joy and praise, with a multitude that kept holyday."],["Romans",8,28,0,"And we know that all things work together for good to them that love God, to them who are the called according to his purpose."],["Hebrews",13,5,0,"Let your conversation be without covetousness; and be content with such things as ye have: for he hath said, I will never leave thee, nor forsake thee."],["Isaiah",41,13,0,"For I the LORD thy God will hold thy right hand, saying unto thee, Fear not; I will help thee."],["Psalms",31,1,0,"In thee, O LORD , do I put my trust; let me never be ashamed: deliver me in thy righteousness."],["Isaiah",53,5,0,"But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed."],["Romans",8,1,0,"There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit."],["Ephesians",2,8,9,"For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast."],["Matthew",6,34,0,"Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof."],["Matthew",7,12,0,"Therefore all things whatsoever ye would that men should do to you, do ye even so to them: for this is the law and the prophets."],["Galatians",2,20,0,"I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me."],["Psalms",27,13,0,"I had fainted , unless I had believed to see the goodness of the LORD in the land of the living."],["1 Corinthians",15,57,0,"But thanks be to God, which giveth us the victory through our Lord Jesus Christ."],["James",5,19,0,"Brethren, if any of you do err from the truth, and one convert him;"],["Psalms",103,20,0,"Bless the LORD , ye his angels, that excel in strength, that do his commandments, hearkening unto the voice of his word."],["Romans",8,38,39,"For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord."],["Psalms",103,1,2,"Bless the LORD , O my soul: and all that is within me, bless his holy name. Bless the LORD , O my soul, and forget not all his benefits:"],["Psalms",121,1,2,"I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD , which made heaven and earth."],["John",13,34,35,"A new commandment I give unto you, That ye love one another; as I have loved you, that ye also love one another. By this shall all men know that ye are my disciples, if ye have love one to another."],["Proverbs",4,23,0,"Keep thy heart with all diligence; for out of it are the issues of life."],["Psalms",91,1,2,"He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty. I will say of the LORD , He is my refuge and my fortress: my God; in him will I trust."],["Matthew",6,6,0,"But thou, when thou prayest, enter into thy closet, and when thou hast shut thy door, pray to thy Father which is in secret; and thy Father which seeth in secret shall reward thee openly."],["Romans",15,30,0,"Now I beseech you, brethren, for the Lord Jesus Christ’s sake, and for the love of the Spirit, that ye strive together with me in your prayers to God for me;"],["Galatians",6,10,0,"As we have therefore opportunity, let us do good unto all men , especially unto them who are of the household of faith."],["Romans",15,4,0,"For whatsoever things were written aforetime were written for our learning, that we through patience and comfort of the scriptures might have hope."],["Proverbs",27,2,0,"Let another man praise thee, and not thine own mouth; a stranger, and not thine own lips."],["Matthew",11,28,30,"Come unto me, all ye that labour and are heavy laden, and I will give you rest. Take my yoke upon you, and learn of me; for I am meek and lowly in heart: and ye shall find rest unto your souls. For my yoke is easy, and my burden is light."],["Hebrews",10,22,0,"Let us draw near with a true heart in full assurance of faith, having our hearts sprinkled from an evil conscience, and our bodies washed with pure water."],["1 Samuel",16,7,0,"But the LORD said unto Samuel, Look not on his countenance, or on the height of his stature; because I have refused him: for the Lord seeth not as man seeth; for man looketh on the outward appearance, but the LORD looketh on the heart."],["Psalms",138,8,0,"The LORD will perfect that which concerneth me: thy mercy, O LORD , endureth for ever: forsake not the works of thine own hands."],["Galatians",6,14,0,"But God forbid that I should glory, save in the cross of our Lord Jesus Christ, by whom the world is crucified unto me, and I unto the world."],["Proverbs",22,6,0,"Train up a child in the way he should go: and when he is old, he will not depart from it."],["1 Peter",4,7,0,"But the end of all things is at hand: be ye therefore sober, and watch unto prayer."],["Proverbs",3,21,0,"My son, let not them depart from thine eyes: keep sound wisdom and discretion:"],["John",14,28,0,"Ye have heard how I said unto you, I go away, and come again unto you. If ye loved me, ye would rejoice, because I said, I go unto the Father: for my Father is greater than I."],["Proverbs",8,28,0,"When he established the clouds above: when he strengthened the fountains of the deep:"],["Psalms",119,166,0,"LORD , I have hoped for thy salvation, and done thy commandments."],["Matthew",28,19,20,"Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost: Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you alway, even unto the end of the world. Amen."],["Proverbs",3,3,0,"Let not mercy and truth forsake thee: bind them about thy neck; write them upon the table of thine heart:"],["Psalms",133,3,0,"As the dew of Hermon, and as the dew that descended upon the mountains of Zion: for there the LORD commanded the blessing, even life for evermore."],["Proverbs",16,17,0,"The highway of the upright is to depart from evil: he that keepeth his way preserveth his soul."],["2 Corinthians",9,7,0,"Every man according as he purposeth in his heart, so let him give ; not grudgingly, or of necessity: for God loveth a cheerful giver."],["1 John",3,1,0,"Behold, what manner of love the Father hath bestowed upon us, that we should be called the sons of God: therefore the world knoweth us not, because it knew him not."],["Isaiah",55,11,0,"So shall my word be that goeth forth out of my mouth: it shall not return unto me void, but it shall accomplish that which I please, and it shall prosper in the thing whereto I sent it."],["John",16,33,0,"These things I have spoken unto you, that in me ye might have peace. In the world ye shall have tribulation: but be of good cheer; I have overcome the world."],["Proverbs",19,21,0,"There are many devices in a man’s heart; nevertheless the counsel of the LORD , that shall stand."],["Psalms",27,8,0,"When thou saidst , Seek ye my face; my heart said unto thee, Thy face, LORD , will I seek."],["Psalms",119,161,0,"Princes have persecuted me without a cause: but my heart standeth in awe of thy word."],["Proverbs",18,15,0,"The heart of the prudent getteth knowledge; and the ear of the wise seeketh knowledge."],["Luke",11,28,0,"But he said, Yea rather, blessed are they that hear the word of God, and keep it."],["Matthew",22,37,39,"Jesus said unto him, Thou shalt love the Lord thy God with all thy heart, and with all thy soul, and with all thy mind. This is the first and great commandment. And the second is like unto it, Thou shalt love thy neighbour as thyself."],["Psalms",119,145,0,"I cried with my whole heart; hear me, O LORD : I will keep thy statutes."],["Psalms",119,42,0,"So shall I have wherewith to answer him that reproacheth me: for I trust in thy word."],["Romans",10,17,0,"So then faith cometh by hearing, and hearing by the word of God."],["Proverbs",16,9,0,"A man’s heart deviseth his way: but the LORD directeth his steps."],["1 Peter",1,5,0,"Who are kept by the power of God through faith unto salvation ready to be revealed in the last time."],["Proverbs",11,2,0,"When pride cometh, then cometh shame: but with the lowly is wisdom."],["Psalms",55,22,0,"Cast thy burden upon the LORD , and he shall sustain thee: he shall never suffer the righteous to be moved."],["Proverbs",17,17,0,"A friend loveth at all times, and a brother is born for adversity."],["Psalms",119,50,0,"This is my comfort in my affliction: for thy word hath quickened me."],["Psalms",31,24,0,"Be of good courage, and he shall strengthen your heart, all ye that hope in the LORD ."],["2 Corinthians",5,17,0,"Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new."],["Psalms",119,11,0,"Thy word have I hid in mine heart, that I might not sin against thee."],["Philippians",4,19,0,"But my God shall supply all your need according to his riches in glory by Christ Jesus."],["Psalms",27,1,0,"The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?"],["Isaiah",9,6,0,"For unto us a child is born, unto us a son is given: and the government shall be upon his shoulder: and his name shall be called Wonderful, Counsellor, The mighty God, The everlasting Father, The Prince of Peace."],["Ephesians",1,14,0,"Which is the earnest of our inheritance until the redemption of the purchased possession, unto the praise of his glory."],["Psalms",40,16,0,"Let all those that seek thee rejoice and be glad in thee: let such as love thy salvation say continually, The LORD be magnified."],["Romans",10,9,0,"That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved."],["James",5,11,0,"Behold, we count them happy which endure. Ye have heard of the patience of Job, and have seen the end of the Lord; that the Lord is very pitiful, and of tender mercy."],["Psalms",63,5,0,"My soul shall be satisfied as with marrow and fatness; and my mouth shall praise thee with joyful lips:"],["Hebrews",11,13,0,"These all died in faith, not having received the promises, but having seen them afar off, and were persuaded of them , and embraced them , and confessed that they were strangers and pilgrims on the earth."],["Psalms",84,11,0,"For the LORD God is a sun and shield: the LORD will give grace and glory: no good thing will he withhold from them that walk uprightly."],["Hebrews",4,16,0,"Let us therefore come boldly unto the throne of grace, that we may obtain mercy, and find grace to help in time of need."],["Proverbs",12,1,0,"Whoso loveth instruction loveth knowledge: but he that hateth reproof is brutish."],["Psalms",34,4,0,"I sought the LORD , and he heard me, and delivered me from all my fears."],["James",4,9,0,"Be afflicted, and mourn, and weep: let your laughter be turned to mourning, and your joy to heaviness."],["1 Peter",5,7,0,"Casting all your care upon him; for he careth for you."],["Psalms",23,4,0,"Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me."],["Joshua",1,9,0,"Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest."],["Romans",12,18,0,"If it be possible, as much as lieth in you, live peaceably with all men."],["Jeremiah",31,3,0,"The LORD hath appeared of old unto me, saying , Yea, I have loved thee with an everlasting love: therefore with lovingkindness have I drawn thee."],["John",8,42,0,"Jesus said unto them, If God were your Father, ye would love me: for I proceeded forth and came from God; neither came I of myself, but he sent me."],["2 Chronicles",7,14,0,"If my people, which are called by my name, shall humble themselves, and pray, and seek my face, and turn from their wicked ways; then will I hear from heaven, and will forgive their sin, and will heal their land."],["Philippians",4,6,7,"Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus."],["2 Corinthians",5,7,0,"(For we walk by faith, not by sight:)"],["Matthew",7,7,0,"Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you:"],["Hebrews",11,9,0,"By faith he sojourned in the land of promise, as in a strange country, dwelling in tabernacles with Isaac and Jacob, the heirs with him of the same promise:"],["John",1,1,0,"In the beginning was the Word, and the Word was with God, and the Word was God."],["James",1,12,0,"Blessed is the man that endureth temptation: for when he is tried, he shall receive the crown of life, which the Lord hath promised to them that love him."],["Proverbs",3,2,0,"For length of days, and long life, and peace, shall they add to thee."],["Psalms",103,11,0,"For as the heaven is high above the earth, so great is his mercy toward them that fear him."],["Romans",12,21,0,"Be not overcome of evil, but overcome evil with good."],["Psalms",16,11,0,"Thou wilt shew me the path of life: in thy presence is fulness of joy; at thy right hand there are pleasures for evermore."],["Isaiah",55,8,9,"For my thoughts are not your thoughts, neither are your ways my ways, saith the LORD . For as the heavens are higher than the earth, so are my ways higher than your ways, and my thoughts than your thoughts."],["Isaiah",40,31,0,"But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint."],["Psalms",37,7,0,"Rest in the LORD , and wait patiently for him: fret not thyself because of him who prospereth in his way, because of the man who bringeth wicked devices to pass."],["Acts",20,35,0,"I have shewed you all things, how that so labouring ye ought to support the weak, and to remember the words of the Lord Jesus, how he said, It is more blessed to give than to receive."],["Acts",4,12,0,"Neither is there salvation in any other: for there is none other name under heaven given among men, whereby we must be saved."],["Romans",5,8,0,"But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us."],["Nahum",1,7,0,"The LORD is good, a strong hold in the day of trouble; and he knoweth them that trust in him."],["John",6,35,0,"And Jesus said unto them, I am the bread of life: he that cometh to me shall never hunger; and he that believeth on me shall never thirst."],["Proverbs",3,12,0,"For whom the LORD loveth he correcteth; even as a father the son in whom he delighteth."],["James",5,16,0,"Confess your faults one to another, and pray one for another, that ye may be healed. The effectual fervent prayer of a righteous man availeth much."],["Proverbs",12,8,0,"A man shall be commended according to his wisdom: but he that is of a perverse heart shall be despised."],["Jeremiah",31,15,0,"Thus saith the LORD ; A voice was heard in Ramah, lamentation, and bitter weeping; Rahel weeping for her children refused to be comforted for her children, because they were not."],["Psalms",30,3,0,"O LORD , thou hast brought up my soul from the grave: thou hast kept me alive, that I should not go down to the pit."],["Psalms",23,1,0,"The LORD is my shepherd; I shall not want."],["1 Corinthians",10,13,0,"There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able; but will with the temptation also make a way to escape, that ye may be able to bear it."],["Psalms",119,35,0,"Make me to go in the path of thy commandments; for therein do I delight."],["John",1,12,0,"But as many as received him, to them gave he power to become the sons of God, even to them that believe on his name:"],["Jeremiah",29,31,0,"Send to all them of the captivity, saying, Thus saith the LORD concerning Shemaiah the Nehelamite; Because that Shemaiah hath prophesied unto you, and I sent him not, and he caused you to trust in a lie:"],["Proverbs",11,25,0,"The liberal soul shall be made fat: and he that watereth shall be watered also himself."],["1 John",4,19,0,"We love him, because he first loved us."],["Psalms",94,19,0,"In the multitude of my thoughts within me thy comforts delight my soul."],["John",13,35,0,"By this shall all men know that ye are my disciples, if ye have love one to another."],["Psalms",91,11,0,"For he shall give his angels charge over thee, to keep thee in all thy ways."],["John",11,25,26,"Jesus said unto her, I am the resurrection, and the life: he that believeth in me, though he were dead, yet shall he live: And whosoever liveth and believeth in me shall never die. Believest thou this?"],["James",4,7,8,"Submit yourselves therefore to God. Resist the devil, and he will flee from you. Draw nigh to God, and he will draw nigh to you. Cleanse your hands, ye sinners; and purify your hearts, ye double minded."],["Psalms",119,48,0,"My hands also will I lift up unto thy commandments, which I have loved; and I will meditate in thy statutes."],["Psalms",19,1,0,"The heavens declare the glory of God; and the firmament sheweth his handywork."],["Acts",1,8,0,"But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judæa, and in Samaria, and unto the uttermost part of the earth."],["John",10,10,0,"The thief cometh not, but for to steal, and to kill, and to destroy: I am come that they might have life, and that they might have it more abundantly."],["Deuteronomy",31,6,0,"Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee."],["Philippians",2,16,0,"Holding forth the word of life; that I may rejoice in the day of Christ, that I have not run in vain, neither laboured in vain."],["Matthew",5,44,0,"But I say unto you, Love your enemies, bless them that curse you, do good to them that hate you, and pray for them which despitefully use you, and persecute you;"],["Psalms",138,3,0,"In the day when I cried thou answeredst me, and strengthenedst me with strength in my soul."],["Galatians",6,1,0,"Brethren, if a man be overtaken in a fault, ye which are spiritual, restore such an one in the spirit of meekness; considering thyself, lest thou also be tempted."],["Colossians",3,4,0,"When Christ, who is our life, shall appear, then shall ye also appear with him in glory."],["Ephesians",4,32,0,"And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ’s sake hath forgiven you."],["Psalms",119,129,0,"Thy testimonies are wonderful: therefore doth my soul keep them."],["Psalms",103,17,0,"But the mercy of the LORD is from everlasting to everlasting upon them that fear him, and his righteousness unto children’s children;"],["Psalms",91,2,0,"I will say of the LORD , He is my refuge and my fortress: my God; in him will I trust."],["John",1,17,0,"For the law was given by Moses, but grace and truth came by Jesus Christ."],["Psalms",31,7,0,"I will be glad and rejoice in thy mercy: for thou hast considered my trouble; thou hast known my soul in adversities;"],["Psalms",138,5,0,"Yea, they shall sing in the ways of the LORD : for great is the glory of the LORD ."],["Ephesians",3,20,0,"Now unto him that is able to do exceeding abundantly above all that we ask or think, according to the power that worketh in us,"],["Psalms",145,18,0,"The LORD is nigh unto all them that call upon him, to all that call upon him in truth."],["Psalms",119,130,0,"The entrance of thy words giveth light; it giveth understanding unto the simple."],["1 Peter",4,8,0,"And above all things have fervent charity among yourselves: for charity shall cover the multitude of sins."],["1 Peter",2,17,0,"Honour all men . Love the brotherhood. Fear God. Honour the king."],["1 Timothy",4,12,0,"Let no man despise thy youth; but be thou an example of the believers, in word, in conversation, in charity, in spirit, in faith, in purity."],["2 Corinthians",12,9,0,"And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness. Most gladly therefore will I rather glory in my infirmities, that the power of Christ may rest upon me."],["Psalms",86,14,0,"O God, the proud are risen against me, and the assemblies of violent men have sought after my soul; and have not set thee before them."],["Luke",11,43,0,"Woe unto you, Pharisees! for ye love the uppermost seats in the synagogues, and greetings in the markets."],["Psalms",116,8,0,"For thou hast delivered my soul from death, mine eyes from tears, and my feet from falling."],["Psalms",32,8,0,"I will instruct thee and teach thee in the way which thou shalt go: I will guide thee with mine eye."],["Hebrews",4,8,0,"For if Jesus had given them rest, then would he not afterward have spoken of another day."],["Psalms",51,10,0,"Create in me a clean heart, O God; and renew a right spirit within me."],["Psalms",139,14,0,"I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well."],["Revelation",3,20,0,"Behold, I stand at the door, and knock: if any man hear my voice, and open the door, I will come in to him, and will sup with him, and he with me."],["Psalms",119,36,0,"Incline my heart unto thy testimonies, and not to covetousness."],["Proverbs",14,4,0,"Where no oxen are , the crib is clean: but much increase is by the strength of the ox."],["John",16,26,0,"At that day ye shall ask in my name: and I say not unto you, that I will pray the Father for you:"],["Proverbs",22,19,0,"That thy trust may be in the LORD , I have made known to thee this day, even to thee."],["Psalms",37,3,0,"Trust in the LORD , and do good; so shalt thou dwell in the land, and verily thou shalt be fed."],["Luke",11,9,0,"And I say unto you, Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you."],["James",1,17,0,"Every good gift and every perfect gift is from above, and cometh down from the Father of lights, with whom is no variableness, neither shadow of turning."],["Galatians",5,22,23,"But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, Meekness, temperance: against such there is no law."],["Proverbs",16,13,0,"Righteous lips are the delight of kings; and they love him that speaketh right."],["Psalms",147,3,0,"He healeth the broken in heart, and bindeth up their wounds."],["Hebrews",13,15,0,"By him therefore let us offer the sacrifice of praise to God continually, that is, the fruit of our lips giving thanks to his name."],["Proverbs",10,22,0,"The blessing of the LORD , it maketh rich, and he addeth no sorrow with it."],["John",3,16,0,"For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life."],["Proverbs",19,22,0,"The desire of a man is his kindness: and a poor man is better than a liar."],["1 Peter",1,22,0,"Seeing ye have purified your souls in obeying the truth through the Spirit unto unfeigned love of the brethren, see that ye love one another with a pure heart fervently:"],["Proverbs",4,5,0,"Get wisdom, get understanding: forget it not; neither decline from the words of my mouth."],["Romans",3,23,0,"For all have sinned, and come short of the glory of God;"],["Psalms",107,1,0,"O give thanks unto the LORD , for he is good: for his mercy endureth for ever."],["Ephesians",6,23,0,"Peace be to the brethren, and love with faith, from God the Father and the Lord Jesus Christ."],["Proverbs",4,18,0,"But the path of the just is as the shining light, that shineth more and more unto the perfect day."],["John",14,1,0,"Let not your heart be troubled: ye believe in God, believe also in me."],["Isaiah",61,11,0,"For as the earth bringeth forth her bud, and as the garden causeth the things that are sown in it to spring forth; so the Lord GOD will cause righteousness and praise to spring forth before all the nations."],["Proverbs",15,1,0,"A soft answer turneth away wrath: but grievous words stir up anger."],["Proverbs",18,10,0,"The name of the LORD is a strong tower: the righteous runneth into it, and is safe."],["Psalms",119,105,0,"Thy word is a lamp unto my feet, and a light unto my path."],["James",3,17,0,"But the wisdom that is from above is first pure, then peaceable, gentle, and easy to be intreated, full of mercy and good fruits, without partiality, and without hypocrisy."],["Psalms",30,4,0,"Sing unto the LORD , O ye saints of his, and give thanks at the remembrance of his holiness."],["Psalms",143,8,0,"Cause me to hear thy lovingkindness in the morning; for in thee do I trust: cause me to know the way wherein I should walk; for I lift up my soul unto thee."],["Luke",6,31,0,"And as ye would that men should do to you, do ye also to them likewise."],["Philippians",4,8,0,"Finally, brethren, whatsoever things are true, whatsoever things are honest, whatsoever things are just, whatsoever things are pure, whatsoever things are lovely, whatsoever things are of good report; if there be any virtue, and if there be any praise, think on these things."],["1 Peter",3,10,0,"For he that will love life, and see good days, let him refrain his tongue from evil, and his lips that they speak no guile:"],["Psalms",34,18,0,"The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit."],["Psalms",145,1,0,"I will extol thee, my God, O king; and I will bless thy name for ever and ever."],["Psalms",33,2,0,"Praise the LORD with harp: sing unto him with the psaltery and an instrument of ten strings."],["Psalms",136,1,0,"O give thanks unto the LORD ; for he is good: for his mercy endureth for ever."],["Romans",15,24,0,"Whensoever I take my journey into Spain, I will come to you: for I trust to see you in my journey, and to be brought on my way thitherward by you, if first I be somewhat filled with your company ."],["Psalms",118,24,0,"This is the day which the LORD hath made; we will rejoice and be glad in it."],["Job",19,25,0,"For I know that my redeemer liveth, and that he shall stand at the latter day upon the earth:"],["1 Peter",3,15,0,"But sanctify the Lord God in your hearts: and be ready always to give an answer to every man that asketh you a reason of the hope that is in you with meekness and fear:"],["Lamentations",3,25,0,"The LORD is good unto them that wait for him, to the soul that seeketh him."],["Colossians",1,2,0,"To the saints and faithful brethren in Christ which are at Colosse: Grace be unto you, and peace, from God our Father and the Lord Jesus Christ."],["Psalms",131,2,0,"Surely I have behaved and quieted myself, as a child that is weaned of his mother: my soul is even as a weaned child."],["Psalms",146,10,0,"The LORD shall reign for ever, even thy God, O Zion, unto all generations. Praise ye the LORD ."],["2 Timothy",1,7,0,"For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind."],["Hebrews",4,12,0,"For the word of God is quick, and powerful, and sharper than any twoedged sword, piercing even to the dividing asunder of soul and spirit, and of the joints and marrow, and is a discerner of the thoughts and intents of the heart."],["James",2,17,0,"Even so faith, if it hath not works, is dead, being alone."],["Romans",15,13,0,"Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost."],["Zephaniah",3,17,0,"The LORD thy God in the midst of thee is mighty; he will save, he will rejoice over thee with joy; he will rest in his love, he will joy over thee with singing."],["Psalms",37,4,5,"Delight thyself also in the LORD ; and he shall give thee the desires of thine heart. Commit thy way unto the LORD ; trust also in him; and he shall bring it to pass."],["Psalms",37,37,0,"Mark the perfect man , and behold the upright: for the end of that man is peace."],["Exodus",14,14,0,"The LORD shall fight for you, and ye shall hold your peace."],["John",8,12,0,"Then spake Jesus again unto them, saying, I am the light of the world: he that followeth me shall not walk in darkness, but shall have the light of life."],["Psalms",18,2,0,"The LORD is my rock, and my fortress, and my deliverer; my God, my strength, in whom I will trust; my buckler, and the horn of my salvation, and my high tower."],["Hebrews",4,11,0,"Let us labour therefore to enter into that rest, lest any man fall after the same example of unbelief."],["Romans",15,8,0,"Now I say that Jesus Christ was a minister of the circumcision for the truth of God, to confirm the promises made unto the fathers:"],["Psalms",100,4,5,"Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name. For the LORD is good; his mercy is everlasting; and his truth endureth to all generations."],["Lamentations",3,22,23,"It is of the LORD’s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness."],["Jeremiah",17,14,0,"Heal me, O LORD , and I shall be healed; save me, and I shall be saved: for thou art my praise."],["Jeremiah",29,11,0,"For I know the thoughts that I think toward you, saith the LORD , thoughts of peace, and not of evil, to give you an expected end."],["Philippians",2,27,0,"For indeed he was sick nigh unto death: but God had mercy on him; and not on him only, but on me also, lest I should have sorrow upon sorrow."],["Jeremiah",31,25,0,"For I have satiated the weary soul, and I have replenished every sorrowful soul."],["Psalms",126,5,0,"They that sow in tears shall reap in joy."],["Psalms",131,3,0,"Let Israel hope in the LORD from henceforth and for ever."],["Luke",12,7,0,"But even the very hairs of your head are all numbered. Fear not therefore: ye are of more value than many sparrows."],["Psalms",86,17,0,"Shew me a token for good; that they which hate me may see it , and be ashamed: because thou, LORD , hast holpen me, and comforted me."],["John",4,24,0,"God is a Spirit: and they that worship him must worship him in spirit and in truth."],["Matthew",6,15,0,"But if ye forgive not men their trespasses, neither will your Father forgive your trespasses."],["Psalms",103,22,0,"Bless the LORD , all his works in all places of his dominion: bless the LORD , O my soul."],["Proverbs",18,21,0,"Death and life are in the power of the tongue: and they that love it shall eat the fruit thereof."],["Colossians",1,9,0,"For this cause we also, since the day we heard it , do not cease to pray for you, and to desire that ye might be filled with the knowledge of his will in all wisdom and spiritual understanding;"],["James",2,5,0,"Hearken, my beloved brethren, Hath not God chosen the poor of this world rich in faith, and heirs of the kingdom which he hath promised to them that love him?"],["Matthew",6,21,0,"For where your treasure is, there will your heart be also."],["Micah",6,8,0,"He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?"],["1 Peter",2,20,0,"For what glory is it , if, when ye be buffeted for your faults, ye shall take it patiently? but if, when ye do well, and suffer for it , ye take it patiently, this is acceptable with God."],["Ecclesiastes",3,1,0,"To every thing there is a season, and a time to every purpose under the heaven:"],["Hebrews",11,1,0,"Now faith is the substance of things hoped for, the evidence of things not seen."],["Romans",1,16,0,"For I am not ashamed of the gospel of Christ: for it is the power of God unto salvation to every one that believeth; to the Jew first, and also to the Greek."],["Isaiah",41,10,0,"Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness."],["Matthew",5,14,0,"Ye are the light of the world. A city that is set on an hill cannot be hid."],["1 Corinthians",13,13,0,"And now abideth faith, hope, charity, these three; but the greatest of these is charity."],["Romans",8,31,0,"What shall we then say to these things? If God be for us, who can be against us?"],["Psalms",28,7,0,"The LORD is my strength and my shield; my heart trusted in him, and I am helped: therefore my heart greatly rejoiceth; and with my song will I praise him."],["Psalms",56,3,0,"What time I am afraid, I will trust in thee."],["Isaiah",26,3,0,"Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee."],["Isaiah",43,19,0,"Behold, I will do a new thing; now it shall spring forth; shall ye not know it? I will even make a way in the wilderness, and rivers in the desert."],["Jeremiah",17,7,8,"Blessed is the man that trusteth in the LORD , and whose hope the LORD is. For he shall be as a tree planted by the waters, and that spreadeth out her roots by the river, and shall not see when heat cometh, but her leaf shall be green; and shall not be careful in the year of drought, neither shall cease from yielding fruit."],["Proverbs",16,23,0,"The heart of the wise teacheth his mouth, and addeth learning to his lips."],["Isaiah",58,11,0,"And the LORD shall guide thee continually, and satisfy thy soul in drought, and make fat thy bones: and thou shalt be like a watered garden, and like a spring of water, whose waters fail not."],["Matthew",6,33,0,"But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you."],["Psalms",95,10,0,"Forty years long was I grieved with this generation, and said, It is a people that do err in their heart, and they have not known my ways:"],["Psalms",119,140,0,"Thy word is very pure: therefore thy servant loveth it."],["1 John",4,18,0,"There is no fear in love; but perfect love casteth out fear: because fear hath torment. He that feareth is not made perfect in love."],["Hebrews",13,8,0,"Jesus Christ the same yesterday, and to day, and for ever."],["Psalms",125,4,0,"Do good, O LORD , unto those that be good, and to them that are upright in their hearts."],["John",14,31,0,"But that the world may know that I love the Father; and as the Father gave me commandment, even so I do. Arise, let us go hence."],["Isaiah",40,29,0,"He giveth power to the faint; and to them that have no might he increaseth strength."],["Proverbs",2,10,0,"When wisdom entereth into thine heart, and knowledge is pleasant unto thy soul;"],["Romans",5,1,0,"Therefore being justified by faith, we have peace with God through our Lord Jesus Christ:"],["Mark",12,30,0,"And thou shalt love the Lord thy God with all thy heart, and with all thy soul, and with all thy mind, and with all thy strength: this is the first commandment."],["Psalms",16,2,0,"O my soul , thou hast said unto the LORD , Thou art my Lord: my goodness extendeth not to thee;"],["Proverbs",27,17,0,"Iron sharpeneth iron; so a man sharpeneth the countenance of his friend."],["John",13,23,0,"Now there was leaning on Jesus’ bosom one of his disciples, whom Jesus loved."],["John",8,40,0,"But now ye seek to kill me, a man that hath told you the truth, which I have heard of God: this did not Abraham."],["Psalms",96,3,0,"Declare his glory among the heathen, his wonders among all people."],["Mark",11,24,0,"Therefore I say unto you, What things soever ye desire, when ye pray, believe that ye receive them , and ye shall have them ."],["John",10,27,28,"My sheep hear my voice, and I know them, and they follow me: And I give unto them eternal life; and they shall never perish, neither shall any man pluck them out of my hand."],["Luke",10,20,0,"Notwithstanding in this rejoice not, that the spirits are subject unto you; but rather rejoice, because your names are written in heaven."],["Psalms",25,4,5,"Shew me thy ways, O LORD ; teach me thy paths. Lead me in thy truth, and teach me: for thou art the God of my salvation; on thee do I wait all the day."],["Luke",1,37,0,"For with God nothing shall be impossible."],["Proverbs",3,5,6,"Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths."],["2 Peter",3,9,0,"The Lord is not slack concerning his promise, as some men count slackness; but is longsuffering to us-ward, not willing that any should perish, but that all should come to repentance."],["Ephesians",1,1,0,"Paul, an apostle of Jesus Christ by the will of God, to the saints which are at Ephesus, and to the faithful in Christ Jesus:"],["Isaiah",49,13,0,"Sing, O heavens; and be joyful, O earth; and break forth into singing, O mountains: for the LORD hath comforted his people, and will have mercy upon his afflicted."],["John",15,12,13,"This is my commandment, That ye love one another, as I have loved you. Greater love hath no man than this, that a man lay down his life for his friends."],["Habakkuk",3,19,0,"The LORD God is my strength, and he will make my feet like hinds’ feet , and he will make me to walk upon mine high places. To the chief singer on my stringed instruments."],["Psalms",119,49,0,"Remember the word unto thy servant, upon which thou hast caused me to hope."],["Psalms",103,8,0,"The LORD is merciful and gracious, slow to anger, and plenteous in mercy."],["Matthew",5,16,0,"Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven."],["Hebrews",12,1,2,"Wherefore seeing we also are compassed about with so great a cloud of witnesses, let us lay aside every weight, and the sin which doth so easily beset us , and let us run with patience the race that is set before us, Looking unto Jesus the author and finisher of our faith; who for the joy that was set before him endured the cross, despising the shame, and is set down at the right hand of the throne of God."],["Colossians",3,23,0,"And whatsoever ye do, do it heartily, as to the Lord, and not unto men;"],["2 Corinthians",4,1,0,"Therefore seeing we have this ministry, as we have received mercy, we faint not;"],["James",2,24,0,"Ye see then how that by works a man is justified, and not by faith only."],["Philippians",1,6,0,"Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ:"],["Psalms",119,111,0,"Thy testimonies have I taken as an heritage for ever: for they are the rejoicing of my heart."],["Psalms",119,112,0,"I have inclined mine heart to perform thy statutes alway, even unto the end."],["Psalms",33,16,0,"There is no king saved by the multitude of an host: a mighty man is not delivered by much strength."],["Psalms",121,7,8,"The LORD shall preserve thee from all evil: he shall preserve thy soul. The LORD shall preserve thy going out and thy coming in from this time forth, and even for evermore."],["Psalms",37,5,0,"Commit thy way unto the LORD ; trust also in him; and he shall bring it to pass."],["1 John",5,3,0,"For this is the love of God, that we keep his commandments: and his commandments are not grievous."],["1 Corinthians",13,4,7,"Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, Doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil; Rejoiceth not in iniquity, but rejoiceth in the truth; Beareth all things, believeth all things, hopeth all things, endureth all things."],["Hebrews",12,2,0,"Looking unto Jesus the author and finisher of our faith; who for the joy that was set before him endured the cross, despising the shame, and is set down at the right hand of the throne of God."],["Psalms",138,1,0,"I will praise thee with my whole heart: before the gods will I sing praise unto thee."],["Psalms",90,12,0,"So teach us to number our days, that we may apply our hearts unto wisdom."],["Psalms",40,11,0,"Withhold not thou thy tender mercies from me, O LORD : let thy lovingkindness and thy truth continually preserve me."],["Psalms",46,1,0,"God is our refuge and strength, a very present help in trouble."],["Philippians",1,18,0,"What then? notwithstanding, every way, whether in pretence, or in truth, Christ is preached; and I therein do rejoice, yea, and will rejoice."],["Luke",6,37,0,"Judge not, and ye shall not be judged: condemn not, and ye shall not be condemned: forgive, and ye shall be forgiven:"],["1 Corinthians",16,13,14,"Watch ye, stand fast in the faith, quit you like men, be strong. Let all your things be done with charity."],["Revelation",21,4,0,"And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away."],["Psalms",138,4,0,"All the kings of the earth shall praise thee, O LORD , when they hear the words of thy mouth."],["Romans",6,23,0,"For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord."],["James",1,5,0,"If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him."],["Matthew",18,20,0,"For where two or three are gathered together in my name, there am I in the midst of them."],["John",16,7,0,"Nevertheless I tell you the truth; It is expedient for you that I go away: for if I go not away, the Comforter will not come unto you; but if I depart, I will send him unto you."],["John",14,27,0,"Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid."],["James",1,2,3,"My brethren, count it all joy when ye fall into divers temptations; Knowing this , that the trying of your faith worketh patience."],["1 John",3,16,0,"Hereby perceive we the love of God , because he laid down his life for us: and we ought to lay down our lives for the brethren."],["Psalms",19,14,0,"Let the words of my mouth, and the meditation of my heart, be acceptable in thy sight, O LORD , my strength, and my redeemer."],["Isaiah",40,8,0,"The grass withereth, the flower fadeth: but the word of our God shall stand for ever."],["1 Peter",2,10,0,"Which in time past were not a people, but are now the people of God: which had not obtained mercy, but now have obtained mercy."],["Ephesians",4,2,0,"With all lowliness and meekness, with longsuffering, forbearing one another in love;"],["Psalms",30,5,0,"For his anger endureth but a moment; in his favour is life: weeping may endure for a night, but joy cometh in the morning."],["John",14,15,0,"If ye love me, keep my commandments."],["Philippians",4,4,0,"Rejoice in the Lord alway: and again I say, Rejoice."],["Hebrews",11,29,0,"By faith they passed through the Red sea as by dry land : which the Egyptians assaying to do were drowned."],["John",15,5,0,"I am the vine, ye are the branches: He that abideth in me, and I in him, the same bringeth forth much fruit: for without me ye can do nothing."],["Luke",11,36,0,"If thy whole body therefore be full of light, having no part dark, the whole shall be full of light, as when the bright shining of a candle doth give thee light."],["Psalms",130,6,0,"My soul waiteth for the Lord more than they that watch for the morning: I say, more than they that watch for the morning."],["Galatians",6,9,0,"And let us not be weary in well doing: for in due season we shall reap, if we faint not."],["1 Timothy",6,6,0,"But godliness with contentment is great gain."],["2 Thessalonians",3,3,0,"But the Lord is faithful, who shall stablish you, and keep you from evil."],["1 Thessalonians",5,16,18,"Rejoice evermore. Pray without ceasing. In every thing give thanks: for this is the will of God in Christ Jesus concerning you."],["Psalms",27,7,0,"Hear, O LORD , when I cry with my voice: have mercy also upon me, and answer me."],["Jeremiah",17,17,0,"Be not a terror unto me: thou art my hope in the day of evil."],["Psalms",34,22,0,"The LORD redeemeth the soul of his servants: and none of them that trust in him shall be desolate."],["John",3,17,0,"For God sent not his Son into the world to condemn the world; but that the world through him might be saved."],["John",14,17,0,"Even the Spirit of truth; whom the world cannot receive, because it seeth him not, neither knoweth him: but ye know him; for he dwelleth with you, and shall be in you."],["Isaiah",44,12,0,"The smith with the tongs both worketh in the coals, and fashioneth it with hammers, and worketh it with the strength of his arms: yea, he is hungry, and his strength faileth: he drinketh no water, and is faint."]];
let VOTD = VOTD_DATA;
const rnd = n => Math.floor(Math.random() * n);
const votd = async () => VOTD;
const dayIndex = () => { const n = new Date(); return (Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 864e5) - 1) % 365; };
const bibleCache = {};
const bible = async v => { // public-domain text: your own data/ copy if you add one, otherwise a free public copy online
  if (bibleCache[v]) return bibleCache[v];
  for (const u of BUNDLED[v]) { try { const r = await fetch(u); if (r.ok) return bibleCache[v] = await r.json(); } catch (e) {} }
  throw new Error('Bible text unavailable');
};
let vi = -1, vseq = 0;
const version = () => LS.get(key('version')) || 'KJV';
const passageUrl = (ref, ver) => 'https://www.biblegateway.com/passage/?search=' + encodeURIComponent(ref) + '&version=' + ver;
async function showVerse() {
  const my = ++vseq, ver = version(), link = $('vlink');
  let v;
  try { const d = await votd(); v = d[vi < 0 ? (vi = dayIndex()) : vi]; }
  catch (e) { v = ['John', 3, 16, 0, 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.']; }
  const ref = v[0] + ' ' + v[1] + ':' + v[2] + (v[3] ? '-' + v[3] : '');
  $('read-btn').textContent = 'Read in ' + ver + ' ♡';
  link.hidden = true;
  $('vref').textContent = ref + ' (' + ver + ')';
  let text = ver === 'KJV' ? v[4] : null;
  if (!text && BUNDLED[ver]) {
    try { const d = await bible(ver); text = d[BOOKS.indexOf(v[0])].chapters[v[1] - 1].slice(v[2] - 1, v[3] || v[2]).join(' '); } catch (e) {}
  }
  if (my !== vseq) return;
  if (text) $('verse').textContent = '"' + text + '"';
  else { $('verse').textContent = ref; $('vref').textContent = ''; link.href = passageUrl(ref, ver); link.textContent = 'Read in ' + ver; link.hidden = false; }
}
function nextVerse() { votd().then(d => { vi = (vi + 1 + rnd(d.length - 1)) % d.length; showVerse(); }); }
function setVersion(v) { LS.set(key('version'), v); $('ver').value = v; $('rv').value = v; showVerse(); }
function readPassage() {
  const ref = $('bible1').value.trim(), m = $('msg-bible');
  if (!ref) { m.textContent = 'Type a passage first, like Psalm 23.'; return; }
  m.textContent = '';
  window.open(passageUrl(ref, version()), '_blank', 'noopener');
}
async function readBible(book, ch) {
  if (book !== undefined) { $('bk').value = book; $('bch').value = ch; $('bvs').value = ''; }
  const bi = +$('bk').value, c = +$('bch').value || 1, vs = $('bvs').value.trim(), ver = $('rv').value, out = $('bible-out');
  const ref = BOOKS[bi] + ' ' + c + (vs ? ':' + vs : '');
  out.textContent = '';
  if (!BUNDLED[ver]) {
    const a = document.createElement('a'); a.href = passageUrl(ref, ver); a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 'mini';
    a.textContent = 'Open ' + ref + ' in the ' + ver + ' on BibleGateway';
    out.append('The ' + ver + ' is copyrighted, so it opens on BibleGateway. ', a);
    return;
  }
  out.textContent = 'Loading…';
  try {
    const d = await bible(ver), chap = d[bi].chapters[c - 1];
    if (!chap) { out.textContent = BOOKS[bi] + ' has ' + d[bi].chapters.length + ' chapters.'; return; }
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(vs), from = m ? +m[1] : 1, to = m ? +(m[2] || m[1]) : chap.length;
    out.textContent = '';
    const h = document.createElement('h4'), box = document.createElement('div'), nav = document.createElement('div');
    h.textContent = ref + ' (' + ver + ')'; box.className = 'chap'; nav.className = 'row';
    chap.forEach((t, i) => {
      if (i + 1 < from || i + 1 > to) return;
      const s = document.createElement('span'), n = document.createElement('sup');
      n.textContent = i + 1; s.append(n, ' ' + t + ' '); box.appendChild(s);
    });
    const btn = (label, fn) => { const b = document.createElement('button'); b.className = 'mini'; b.textContent = label; b.onclick = fn; nav.appendChild(b); };
    if (c > 1) btn('◀ Chapter ' + (c - 1), () => readBible(bi, c - 1));
    if (c < d[bi].chapters.length) btn('Chapter ' + (c + 1) + ' ▶', () => readBible(bi, c + 1));
    btn('Use this passage ♡', () => { $('bible1').value = ref; saveDraft(); $('msg-bible').textContent = 'Added to "Today\'s Reading" below ♡'; });
    out.append(h, box, nav);
  } catch (e) { out.textContent = "Couldn't load the Bible text. Check your connection and try again."; }
}

// ---- Songs: Spotify and YouTube links play inside the page ----
const spotify = u => {
  const m = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/.exec(u);
  return m ? {src:'https://open.spotify.com/embed/' + m[1] + '/' + m[2], h:/^(track|episode)$/.test(m[1]) ? 152 : 352} : null;
};
const youtube = u => {
  let m = /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.exec(u);
  if (m) return {src:'https://www.youtube-nocookie.com/embed/' + m[1], yt:true};
  m = /^https?:\/\/(?:www\.|m\.|music\.)?youtube\.com\/(?:playlist|watch)\?(?:[^#]*&)?list=([\w-]+)/.exec(u);
  return m ? {src:'https://www.youtube-nocookie.com/embed/videoseries?list=' + m[1], yt:true} : null;
};
const embed = u => spotify(u) || youtube(u);
function songSearch(base, label) {
  const q = $('sp-q').value.trim(), m = $('msg-worship');
  if (!q) { m.textContent = 'Type a song title first.'; return; }
  m.textContent = 'Copy the song link from ' + label + ', then paste it above ♡';
  window.open(base + encodeURIComponent(q), '_blank', 'noopener');
}
const spotifySearch = () => songSearch('https://open.spotify.com/search/', 'Spotify');
const youtubeSearch = () => songSearch('https://www.youtube.com/results?search_query=', 'YouTube');

// ---- Saved entries (per account) ----
const load = k => { try { return JSON.parse(LS.get(key(k))) || []; } catch (e) { return []; } };
const save = (k, v) => LS.set(key(k), JSON.stringify(v));

function saveDraft() {
  const d = {};
  DRAFTS.forEach(i => { const el = $(i); if (el && el.value) d[i] = el.value; });
  LS.set(key('draft'), JSON.stringify(d));
}
function restoreDraft() {
  let d = {};
  try { d = JSON.parse(LS.get(key('draft'))) || {}; } catch (e) {}
  DRAFTS.forEach(i => { $(i).value = d[i] || ''; });
  ['calendar1', 'prayers2'].forEach(i => { if (!$(i).value) $(i).value = today(); });
}
document.addEventListener('input', e => { if (uid && DRAFTS.includes(e.target.id)) saveDraft(); });

function add(k) {
  const v = [];
  for (let i = 1; i <= FIELDS[k]; i++) v.push($(k + i).value.trim());
  const msg = $('msg-' + k);
  if (k === 'worship' && !/^https?:\/\//i.test(v[1])) { msg.textContent = 'Please paste a link that starts with https://'; return; }
  if (!REQ[k].some(i => v[i])) { msg.textContent = 'Write something first ♡'; return; }
  const items = load(k);
  items.unshift({v, done:false, id:Date.now()});
  if (!save(k, items)) { msg.textContent = "Couldn't save in this browser."; return; }
  for (let i = 1; i <= FIELDS[k]; i++) $(k + i).value = '';
  ['calendar1', 'prayers2'].forEach(i => { if (!$(i).value) $(i).value = today(); });
  saveDraft();
  msg.textContent = 'Saved ♡';
  render(k);
}
const STK = {"star":"<svg viewBox=\"0 0 32 32\"><path d=\"M16 4.5l3.2 7.3 7.9.8-5.9 5.3 1.7 7.8L16 21.6l-6.9 4.1 1.7-7.8-5.9-5.3 7.9-.8z\" fill=\"url(#g-b)\" stroke=\"url(#g-b)\" stroke-width=\"3\" stroke-linejoin=\"round\"/><ellipse cx=\"12\" cy=\"11\" rx=\"3.2\" ry=\"1.6\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(-30 12 11)\"/><circle cx=\"13.2\" cy=\"16\" r=\"1.1\" fill=\"#43385a\"/><circle cx=\"18.8\" cy=\"16\" r=\"1.1\" fill=\"#43385a\"/><ellipse cx=\"11.6\" cy=\"18\" rx=\"1.5\" ry=\"1\" fill=\"#ffa6c4\" opacity=\".8\"/><ellipse cx=\"20.4\" cy=\"18\" rx=\"1.5\" ry=\"1\" fill=\"#ffa6c4\" opacity=\".8\"/></svg>","moon":"<svg viewBox=\"0 0 32 32\"><path d=\"M21 4.5A12 12 0 1 0 27.5 22 9.5 9.5 0 0 1 21 4.5z\" fill=\"url(#g-b)\" stroke=\"url(#g-b)\" stroke-width=\"2.4\" stroke-linejoin=\"round\"/><ellipse cx=\"10.5\" cy=\"13\" rx=\"2.2\" ry=\"5\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(20 10.5 13)\"/><path d=\"M24 8l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z\" fill=\"#fff\"/></svg>","cloud":"<svg viewBox=\"0 0 32 32\"><g fill=\"url(#g-w)\"><circle cx=\"11\" cy=\"19\" r=\"6\"/><circle cx=\"18\" cy=\"15\" r=\"7.5\"/><circle cx=\"24.5\" cy=\"20\" r=\"5\"/><rect x=\"10\" y=\"19\" width=\"15\" height=\"6\" rx=\"3\"/></g><path d=\"M13 12a6 6 0 0 1 4-3\" stroke=\"#fff\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/><g fill=\"#9fc3f2\"><path d=\"M12 20l.9 1.8 1.9.3-1.4 1.3.3 1.9-1.7-.9-1.7.9.3-1.9-1.4-1.3 1.9-.3z\"/><path d=\"M21 16l.8 1.6 1.7.3-1.2 1.2.3 1.7-1.6-.8-1.5.8.3-1.7-1.2-1.2 1.7-.3z\"/></g></svg>","heartB":"<svg viewBox=\"0 0 32 32\"><path d=\"M16 27.5C6 20.5 3.5 13.5 7.5 9.5c3-2.8 6.5-1.3 8.5 1.5 2-2.8 5.5-4.3 8.5-1.5 4 4 1.5 11-8.5 18z\" fill=\"url(#g-b)\" stroke=\"url(#g-b)\" stroke-width=\"2\" stroke-linejoin=\"round\"/><ellipse cx=\"10\" cy=\"12\" rx=\"3\" ry=\"1.6\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(-35 10 12)\"/></svg>","heartP":"<svg viewBox=\"0 0 32 32\"><path d=\"M16 27.5C6 20.5 3.5 13.5 7.5 9.5c3-2.8 6.5-1.3 8.5 1.5 2-2.8 5.5-4.3 8.5-1.5 4 4 1.5 11-8.5 18z\" fill=\"url(#g-p)\" stroke=\"url(#g-p)\" stroke-width=\"2\" stroke-linejoin=\"round\"/><ellipse cx=\"10\" cy=\"12\" rx=\"3\" ry=\"1.6\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(-35 10 12)\"/></svg>","paw":"<svg viewBox=\"0 0 32 32\"><g fill=\"url(#g-p)\"><ellipse cx=\"16\" cy=\"21\" rx=\"7.5\" ry=\"6.2\"/><circle cx=\"7\" cy=\"15\" r=\"3.2\"/><circle cx=\"12.5\" cy=\"9.5\" r=\"3.4\"/><circle cx=\"19.5\" cy=\"9.5\" r=\"3.4\"/><circle cx=\"25\" cy=\"15\" r=\"3.2\"/></g><ellipse cx=\"13\" cy=\"18.5\" rx=\"2.6\" ry=\"1.3\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(-30 13 18.5)\"/></svg>","bow":"<svg viewBox=\"0 0 32 32\"><path d=\"M16 16C11 8 4 8.5 5 15.5c1 6.5 7.5 5.5 11 .5z\" fill=\"url(#g-p)\" stroke=\"url(#g-p)\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/><path d=\"M16 16c5-8 12-7.5 11-.5-1 6.5-7.5 5.5-11 .5z\" fill=\"url(#g-p)\" stroke=\"url(#g-p)\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/><path d=\"M14 19l-4 9 4-2.2 2 3.2zM18 19l4 9-4-2.2-2 3.2z\" fill=\"url(#g-p)\" stroke=\"url(#g-p)\" stroke-width=\"1\" stroke-linejoin=\"round\"/><circle cx=\"16\" cy=\"16.5\" r=\"3.4\" fill=\"url(#g-p)\"/><ellipse cx=\"9\" cy=\"12.5\" rx=\"2.4\" ry=\"1.2\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(-30 9 12.5)\"/></svg>","bear":"<svg viewBox=\"0 0 32 32\"><circle cx=\"8\" cy=\"9\" r=\"5\" fill=\"url(#g-t)\"/><circle cx=\"24\" cy=\"9\" r=\"5\" fill=\"url(#g-t)\"/><circle cx=\"8\" cy=\"9\" r=\"2.6\" fill=\"#ffd0b8\"/><circle cx=\"24\" cy=\"9\" r=\"2.6\" fill=\"#ffd0b8\"/><circle cx=\"16\" cy=\"18\" r=\"11.5\" fill=\"url(#g-t)\"/><ellipse cx=\"16\" cy=\"21.5\" rx=\"5.5\" ry=\"4.2\" fill=\"#fff3e4\"/><ellipse cx=\"16\" cy=\"19.8\" rx=\"1.8\" ry=\"1.2\" fill=\"#5a3d3d\"/><circle cx=\"11.5\" cy=\"16\" r=\"1.2\" fill=\"#43385a\"/><circle cx=\"20.5\" cy=\"16\" r=\"1.2\" fill=\"#43385a\"/><ellipse cx=\"9.5\" cy=\"20\" rx=\"1.7\" ry=\"1.1\" fill=\"#ffa6c4\" opacity=\".7\"/><ellipse cx=\"22.5\" cy=\"20\" rx=\"1.7\" ry=\"1.1\" fill=\"#ffa6c4\" opacity=\".7\"/><ellipse cx=\"11\" cy=\"11.5\" rx=\"3.4\" ry=\"1.7\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(-30 11 11.5)\"/></svg>","strawberry":"<svg viewBox=\"0 0 32 32\"><path d=\"M16 29.5C8 25.5 4.5 18 7.5 13 11 8.5 21 8.5 24.5 13c3 5-.5 12.5-8.5 16.5z\" fill=\"url(#g-r)\"/><path d=\"M9.5 11.5l6.5-4 6.5 4-3.2.6-3.3-2.4-3.3 2.4z\" fill=\"url(#g-g)\" stroke=\"url(#g-g)\" stroke-width=\"1.2\" stroke-linejoin=\"round\"/><g fill=\"#fff\" opacity=\".85\"><circle cx=\"12\" cy=\"16\" r=\".8\"/><circle cx=\"17\" cy=\"15\" r=\".8\"/><circle cx=\"21\" cy=\"18\" r=\".8\"/><circle cx=\"14\" cy=\"21\" r=\".8\"/><circle cx=\"19\" cy=\"23\" r=\".8\"/><circle cx=\"10\" cy=\"20\" r=\".8\"/></g><ellipse cx=\"11.5\" cy=\"14\" rx=\"2.6\" ry=\"1.3\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(-30 11.5 14)\"/></svg>","tulip":"<svg viewBox=\"0 0 32 32\"><path d=\"M16 27c-6 0-9.5-3-10.5-8 6 0 9.5 3 10.5 8z\" fill=\"url(#g-g)\"/><path d=\"M16 17v11.5\" stroke=\"#8bc47a\" stroke-width=\"2.6\" stroke-linecap=\"round\"/><path d=\"M8.5 5.5c-.5 8 1.5 13.5 7.5 13.5s8-5.5 7.5-13.5l-4.5 3.5-3-4-3 4z\" fill=\"url(#g-b)\" stroke=\"url(#g-b)\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><ellipse cx=\"12\" cy=\"12\" rx=\"1.6\" ry=\"3.2\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(15 12 12)\"/></svg>","wings":"<svg viewBox=\"0 0 32 32\"><path d=\"M15 24.5C8 26 1.5 20.5 2.5 8.5c6.5 1 10.5 4.5 12.5 10z\" fill=\"url(#g-w)\" stroke=\"url(#g-w)\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/><path d=\"M17 24.5c7 1.5 13.5-4 12.5-16-6.5 1-10.5 4.5-12.5 10z\" fill=\"url(#g-w)\" stroke=\"url(#g-w)\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/><path d=\"M12 21c-4-.5-7-3-8-8M20 21c4-.5 7-3 8-8\" stroke=\"#d9cde6\" stroke-width=\"1.1\" fill=\"none\" stroke-linecap=\"round\"/><ellipse cx=\"8\" cy=\"12\" rx=\"2.6\" ry=\"1.3\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(40 8 12)\"/></svg>","cross":"<svg viewBox=\"0 0 32 32\"><rect x=\"12\" y=\"4\" width=\"8\" height=\"24\" rx=\"3.4\" fill=\"url(#g-y)\"/><rect x=\"5\" y=\"10.5\" width=\"22\" height=\"8\" rx=\"3.4\" fill=\"url(#g-y)\"/><ellipse cx=\"14.5\" cy=\"9\" rx=\"1.4\" ry=\"3.6\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(0 14.5 9)\"/></svg>","bolt":"<svg viewBox=\"0 0 32 32\"><path d=\"M18.5 3L7.5 18h7.5l-2 11L24.5 13.5H17z\" fill=\"url(#g-y)\" stroke=\"url(#g-y)\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><ellipse cx=\"13\" cy=\"11\" rx=\"1.4\" ry=\"3.6\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(30 13 11)\"/></svg>","shield":"<svg viewBox=\"0 0 32 32\"><path d=\"M16 4l10.5 3.8v7.2c0 6.8-4.8 11.4-10.5 13.2C10.3 26.4 5.5 21.8 5.5 15V7.8z\" fill=\"url(#g-b)\" stroke=\"url(#g-b)\" stroke-width=\"2\" stroke-linejoin=\"round\"/><path d=\"M16 9.5v12M10.5 14.5h11\" stroke=\"#fff\" stroke-width=\"2.6\" stroke-linecap=\"round\"/><ellipse cx=\"10\" cy=\"9\" rx=\"2.4\" ry=\"1.3\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(-20 10 9)\"/></svg>","mountain":"<svg viewBox=\"0 0 32 32\"><path d=\"M2.5 27L12.5 9l5 8.2 3.6-5.2L29.5 27z\" fill=\"url(#g-g)\" stroke=\"url(#g-g)\" stroke-width=\"2\" stroke-linejoin=\"round\"/><path d=\"M12.5 9l-3.3 6 2.4-1 1.8 1.8 1.4-1.8 1.8 1z\" fill=\"#fff\"/></svg>","flame":"<svg viewBox=\"0 0 32 32\"><path d=\"M16 3.5c1.2 6 8.5 9.5 8.5 17a8.5 8.5 0 0 1-17 0c0-4 2.2-6.5 3.4-8.6 1 3 2 4 3.2 4.2-.4-5-1.2-8.2 1.9-12.6z\" fill=\"url(#g-o)\" stroke=\"url(#g-o)\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/><path d=\"M16 18c-3.2 3-4.4 5.4-2.4 8.3a4.5 4.5 0 0 0 8.2-3c0-2.4-2.2-4.2-3.2-6.4-.7 1.6-1.4 2.2-2.6 1.1z\" fill=\"url(#g-y)\"/><ellipse cx=\"11.5\" cy=\"20\" rx=\"1.6\" ry=\"3\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(10 11.5 20)\"/></svg>"};
const STICKERS = Object.keys(STK);
function stkEl(id) { const s = document.createElement('span'); s.className = 'stk'; if (STK[id]) s.innerHTML = STK[id]; else s.textContent = id; return s; }
function patch(k, id, fn) { const a = load(k), it = a.find(x => x.id === id); if (it) fn(it); save(k, a); render(k); }
function setPrayer(k, id, done, date) {
  const a = load(k), it = a.find(x => x.id === id);
  if (it) { it.done = done; if (done) it.ad = date; else delete it.ad; }
  save(k, a); render(k); closeSheet();
}
function remove(k, id) {
  if (confirm('Delete this ' + NAMES[k] + '? This cannot be undone.')) { save(k, load(k).filter(x => x.id !== id)); render(k); closeSheet(); }
}
function answerForm(r, k, id) {
  r.textContent = '';
  const d = document.createElement('input'); d.type = 'date'; d.value = today(); d.className = 'mini-date';
  const s = document.createElement('button'); s.className = 'mini'; s.textContent = 'Save answered date';
  s.onclick = () => setPrayer(k, id, true, d.value || today());
  r.append('Answered on ', d, s);
}

function describe(k, it) {
  const [a, b, c] = it.v;
  if (k === 'bible' || k === 'notes') return {title: a || 'Untitled', text: b};
  if (k === 'calendar') return {title: (b || 'Devotion') + (a ? ' \u00b7 ' + fmt(a) : ''), text: c};
  return {title: c || 'Prayer', text: a, meta: 'Requested' + (b ? ' ' + fmt(b) : '') + (it.done ? ' \u00b7 \u2713 Answered ' + fmt(it.ad) : '')};
}
function card(k, it) {
  const w = k === 'worship', d = document.createElement('div');
  d.className = 'item' + (w ? '' : ' rc') + (it.done ? ' done' : '');
  if (w) {
    const h = document.createElement('h4'), l = document.createElement('a');
    l.href = it.v[1]; l.target = '_blank'; l.rel = 'noopener noreferrer'; l.textContent = '\u266a ' + (it.v[0] || it.v[1]);
    h.appendChild(l); d.appendChild(h);
    const sp = embed(it.v[1]);
    if (sp) {
      const f = document.createElement('iframe');
      f.src = sp.src; f.className = 'sp' + (sp.yt ? ' yt' : ''); if (!sp.yt) f.style.height = sp.h + 'px'; f.loading = 'lazy'; f.allowFullscreen = true;
      f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      d.appendChild(f);
    }
    const r = document.createElement('div'); r.className = 'row';
    const x = document.createElement('button'); x.className = 'mini'; x.textContent = 'Delete';
    x.onclick = () => remove(k, it.id); r.appendChild(x); d.appendChild(r);
    return d;
  }
  const {title, text, meta} = describe(k, it); // compact row: tap it to open the drawer
  const main = document.createElement('div'); main.className = 'rc-main';
  const h = document.createElement('h4'); h.textContent = title; if (it.st) h.prepend(stkEl(it.st)); main.appendChild(h);
  if (meta) { const sm = document.createElement('small'); sm.textContent = meta; main.appendChild(sm); }
  if (text) { const pk = document.createElement('p'); pk.className = 'peek'; pk.textContent = text; main.appendChild(pk); }
  const t = document.createElement('button'); t.className = 'mini trash'; t.title = 'Delete'; t.setAttribute('aria-label', 'Delete'); t.textContent = '\ud83d\uddd1';
  t.onclick = e => { e.stopPropagation(); remove(k, it.id); };
  const ed = document.createElement('button'); ed.className = 'mini trash'; ed.title = 'Edit'; ed.setAttribute('aria-label', 'Edit'); ed.textContent = '✎';
  ed.onclick = e => { e.stopPropagation(); openSheet(k, it); editEntry(k, it); };
  if (k === 'prayers') {
    const a = document.createElement('button'); a.className = 'mini trash'; a.title = it.done ? 'Back to requests' : 'Mark as answered'; a.setAttribute('aria-label', a.title); a.textContent = it.done ? '↩' : '✓';
    a.onclick = e => { e.stopPropagation(); setPrayer(k, it.id, !it.done, today()); };
    d.append(main, a, ed, t);
  } else d.append(main, ed, t);
  d.tabIndex = 0; d.setAttribute('role', 'button');
  d.onclick = () => openSheet(k, it);
  d.onkeydown = e => { if (e.key === 'Enter' && e.target === d) openSheet(k, it); };
  return d;
}
let sheetTimer = null;
const EDIT = {
  bible: [['Passage', 'input', 0], ['Thoughts', 'area', 1]],
  calendar: [['Date of my devotion', 'date', 0], ['Bible reading', 'input', 1], ['What God showed me', 'area', 2]],
  prayers: [['Title of this prayer', 'input', 2], ['Prayer', 'area', 0], ['Date of this request', 'date', 1]],
  notes: [['Title', 'input', 0], ['Note', 'area', 1]]
};
function editEntry(k, it) { // fix a typo: the drawer turns into the same fields you typed in
  const r = $('sheet-actions'), body = $('sheet-body');
  let box = $('sheet-edit');
  if (!box) { box = document.createElement('div'); box.id = 'sheet-edit'; body.parentNode.insertBefore(box, body); }
  box.textContent = ''; box.hidden = false; body.hidden = true;
  if ($('sheet-stk')) $('sheet-stk').hidden = true;
  const fields = EDIT[k].map(([label, type, i]) => {
    const l = document.createElement('label'); l.className = 'lbl'; l.textContent = label;
    const f = document.createElement(type === 'area' ? 'textarea' : 'input');
    if (type === 'date') f.type = 'date'; if (type === 'area') f.style.minHeight = '140px';
    f.value = (it.v[i] || '').trim(); box.append(l, f); return [i, f];
  });
  const msg = document.createElement('p'); msg.className = 'msg'; box.appendChild(msg);
  r.textContent = '';
  const ok = document.createElement('button'); ok.className = 'action'; ok.textContent = 'Save changes ♡';
  ok.onclick = () => {
    const vals = it.v.slice(); while (vals.length < 3) vals.push('');
    fields.forEach(([i, f]) => { vals[i] = f.value.trim(); });
    if (!REQ[k].some(i => vals[i])) { msg.textContent = 'Write something first ♡'; return; }
    patch(k, it.id, x => { x.v = vals; });
    openSheet(k, load(k).find(x => x.id === it.id));
  };
  const no = document.createElement('button'); no.className = 'mini'; no.textContent = 'Cancel'; no.onclick = () => openSheet(k, load(k).find(x => x.id === it.id) || it);
  r.append(ok, no);
  const first = box.querySelector('textarea, input'); if (first) first.focus();
}
function openSheet(k, it) {
  const {title, text, meta} = describe(k, it), r = $('sheet-actions'), s = $('sheet');
  if ($('sheet-edit')) $('sheet-edit').hidden = true;
  $('sheet-body').hidden = false; if ($('sheet-stk')) $('sheet-stk').hidden = false;
  $('sheet-title').textContent = title; if (it.st) $('sheet-title').prepend(stkEl(it.st));
  $('sheet-body').textContent = (meta ? meta + '\n\n' : '') + (text || '(nothing written)');
  let st = $('sheet-stk');
  if (!st) { st = document.createElement('div'); st.id = 'sheet-stk'; r.parentNode.insertBefore(st, r); }
  st.textContent = '';
  STICKERS.forEach(e => {
    const b = document.createElement('button'); b.appendChild(stkEl(e)); b.className = it.st === e ? 'on' : ''; b.title = 'Sticker / bookmark';
    b.onclick = () => { patch(k, it.id, x => { x.st = x.st === e ? '' : e; }); openSheet(k, load(k).find(x => x.id === it.id)); };
    st.appendChild(b);
  });
  r.textContent = '';
  if (k === 'prayers') {
    const t = document.createElement('button'); t.className = 'mini';
    t.textContent = it.done ? 'Back to requests' : '\u2713 Mark answered';
    t.onclick = () => it.done ? setPrayer(k, it.id, false) : answerForm(r, k, it.id);
    r.appendChild(t);
  }
  if (k === 'prayers' && it.done) { const cd = document.createElement('button'); cd.className = 'mini'; cd.textContent = 'Change answered date'; cd.onclick = () => answerForm(r, k, it.id); r.appendChild(cd); }
  const x = document.createElement('button'); x.className = 'mini'; x.textContent = 'Delete'; x.onclick = () => remove(k, it.id);
  const ed = document.createElement('button'); ed.className = 'mini'; ed.textContent = '✎ Edit'; ed.onclick = () => editEntry(k, it);
  const c = document.createElement('button'); c.className = 'mini'; c.textContent = 'Close'; c.onclick = closeSheet;
  r.append(ed, x, c);
  clearTimeout(sheetTimer);
  s.classList.add('show');
  setTimeout(() => s.classList.add('open'), 20);
}
function closeSheet() {
  const s = $('sheet');
  s.classList.remove('open');
  clearTimeout(sheetTimer);
  sheetTimer = setTimeout(() => s.classList.remove('show'), 300);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
function fill(el, items, k, empty) {
  el.textContent = '';
  if (!items.length) { const e = document.createElement('p'); e.className = 'empty'; e.textContent = empty; el.appendChild(e); }
  items.forEach(it => el.appendChild(card(k, it)));
}
function render(k) {
  const items = load(k);
  if (k === 'calendar') items.sort((a, b) => (b.v[0] || '').localeCompare(a.v[0] || ''));
  if (k === 'prayers') {
    fill($('list-prayers'), items.filter(i => !i.done), k, 'No prayer requests yet ♡');
    fill($('list-prayers-done'), items.filter(i => i.done), k, 'Answered prayers will appear here ♡');
  } else fill($('list-' + k), items, k, k === 'calendar' ? 'No devotions saved yet ♡' : 'Nothing saved yet ♡');
}

// ---- Theme: any color, plus dark mode (saved per account, also used on the login page) ----
const theme = () => { try { return JSON.parse(LS.get(key('theme'))) || {c:'#f58ab3', dark:false}; } catch (e) { return {c:'#f58ab3', dark:false}; } };
function setTheme(c) {
  if (typeof c === 'string') $('theme-color').value = c;
  const t = {c: $('theme-color').value, dark: $('theme-dark').checked};
  applyTheme(t);
  LS.set(key('theme'), JSON.stringify(t));
  LS.set('qp_theme', JSON.stringify(t));
}
function resetTheme() { $('theme-dark').checked = false; setTheme('#f58ab3'); }

// ---- Settings ----
function paint() {
  const u = me(), n = u.display || u.name;
  $('welcome').textContent = 'Welcome, ' + n + ' ♡';
  $('who').textContent = n;
}
function refreshSettings() {
  const u = me(), t = theme();
  $('set-display').value = u.display || u.name;
  $('set-user').value = u.name;
  $('ver').value = version();
  $('cat-on').checked = catOn();
  $('theme-color').value = t.c;
  $('theme-dark').checked = !!t.dark;
  let n = 0;
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + localStorage.getItem(k).length; } } catch (e) {}
  $('storage-info').textContent = 'Using about ' + Math.max(1, Math.round(n / 1024)) + ' KB of the roughly 5,000 KB your browser allows for this site.';
}
function saveName() {
  const v = $('set-display').value.trim(), m = $('msg-name');
  if (!v || v.length > 30) { m.textContent = 'Name: 1 to 30 characters.'; return; }
  update(u => { u.display = v; });
  m.textContent = 'Name saved ♡';
  paint();
}
function saveUsername() {
  const v = $('set-user').value.trim(), m = $('msg-user');
  if (!USERNAME.test(v)) { m.textContent = 'Username: 3 to 20 letters, numbers, . _ -'; return; }
  const o = byName(v);
  if (o && idOf(o) !== uid) { m.textContent = 'That username is already taken.'; return; }
  update(u => { u.id = idOf(u); u.name = v; });
  m.textContent = 'Username saved ♡ Use it the next time you log in.';
}
async function changePass() {
  const cur = $('pass-cur').value, nw = $('pass1').value, m = $('msg-pass'), u = me();
  if (nw.length < 4) { m.textContent = 'Use at least 4 characters.'; return; }
  try {
    if (u.h && await hash(idOf(u), cur) !== u.h) { m.textContent = 'Your current passcode is not right.'; return; }
    const h = await hash(idOf(u), nw);
    update(x => { x.h = h; });
  } catch (e) { m.textContent = "Couldn't change the passcode here."; return; }
  $('pass-cur').value = ''; $('pass1').value = '';
  m.textContent = 'Passcode changed ♡';
}
function logout() {
  LS.del('qp_last');
  location.reload();
}
function deleteProfile() {
  if (!confirm('Delete this account and all its entries from this device? This cannot be undone.')) return;
  Object.keys(FIELDS).concat('version', 'theme', 'draft').forEach(k => LS.del(key(k)));
  saveUsers(users().filter(u => idOf(u) !== uid));
  logout();
}

// ---- Backup and restore (current account) ----
function exportData() {
  const data = {}, u = me();
  Object.keys(FIELDS).forEach(k => data[k] = load(k));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({app:'quiet-place', v:2, account:{id:idOf(u), name:u.name, display:u.display || u.name, h:u.h || null}, data, theme:theme(), version:version()})], {type:'application/json'}));
  a.download = 'quiet-place-' + u.name.replace(/\W+/g, '-') + '-' + today() + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  $('msg-data').textContent = 'Backup downloaded ♡ Keep the file private.';
}
function importData(input) {
  const f = input.files[0];
  if (!f) return;
  if (!confirm('Restoring replaces the entries saved in this account. Continue?')) { input.value = ''; return; }
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result).data;
      Object.keys(FIELDS).forEach(k => { if (Array.isArray(d[k])) save(k, d[k]); });
      Object.keys(FIELDS).forEach(render);
      $('msg-data').textContent = 'Backup restored ♡';
    } catch (e) { $('msg-data').textContent = "That file doesn't look like a backup."; }
    input.value = '';
  };
  r.readAsText(f);
}

// ---- Accounts: login, create, stay logged in until you log out ----
function startSession(id) {
  uid = id;
  LS.set('qp_last', id);
  document.documentElement.classList.remove('locked');
  const t = theme();
  applyTheme(t);
  LS.set('qp_theme', JSON.stringify(t));
  paint();
  Object.keys(FIELDS).forEach(render);
  restoreDraft();
  $('rv').value = version();
  showVerse();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
function screen(n) {
  document.documentElement.classList.add('locked');
  ['start', 'login', 'create'].forEach(s => { $(s + '-form').hidden = s !== n; });
  $('msg-lock').textContent = '';
}
function showStart() { screen('start'); $('lock-title').textContent = 'Welcome ♡'; }
function showLogin(pick) {
  const us = users();
  if (!us.length) { showStart(); return; }
  screen('login');
  const sel = $('lock-user');
  sel.textContent = '';
  us.forEach(u => { const o = document.createElement('option'); o.value = idOf(u); o.textContent = u.name; sel.appendChild(o); });
  const want = pick || LS.get('qp_last');
  if (want && us.some(u => idOf(u) === want)) sel.value = want;
  $('lock-title').textContent = 'Welcome back ♡';
  loginChange();
}
function loginChange() {
  const u = users().find(x => idOf(x) === $('lock-user').value);
  $('lockpass').hidden = !(u && u.h);
  $('lockpass').value = '';
}
function showCreate() { screen('create'); $('lock-title').textContent = 'New account ♡'; }
function pickBackup() { $('acct-file').click(); }
function importAccount(input) {
  const f = input.files[0], m = $('msg-lock');
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result), a = d.account;
      if (d.app !== 'quiet-place' || !a || !a.id || !a.name || !d.data) throw 0;
      const same = users().find(u => idOf(u) === a.id);
      let name = a.name;
      if (!same && byName(name)) {
        let n = 2; while (byName(a.name + n)) n++;
        name = a.name + n;
        if (!confirm('This browser already has a different account named "' + a.name + '". Restore the file\'s account as "' + name + '" instead?')) return;
      }
      if (same && !confirm('This account is already here. Replace its entries with the ones in the file?')) return;
      saveUsers(users().filter(u => idOf(u) !== a.id).concat({id:a.id, name, display:a.display || a.name, h:a.h || null}));
      const prev = uid; uid = a.id;
      Object.keys(FIELDS).forEach(k => { if (Array.isArray(d.data[k])) save(k, d.data[k]); });
      if (d.theme) LS.set(key('theme'), JSON.stringify(d.theme));
      if (d.version) LS.set(key('version'), d.version);
      uid = prev;
      showLogin(a.id);
      m.textContent = 'Account found' + (name !== a.name ? ' as "' + name + '"' : '') + ' ♡ Enter your passcode to log in.';
    } catch (e) { m.textContent = "That doesn't look like a Quiet Place backup file."; }
    input.value = '';
  };
  r.readAsText(f);
}
async function unlock() {
  const u = users().find(x => idOf(x) === $('lock-user').value), m = $('msg-lock');
  if (!u) return;
  try {
    if (u.h && await hash(idOf(u), $('lockpass').value) !== u.h) { m.textContent = 'That passcode is not right.'; return; }
  } catch (e) { m.textContent = "Couldn't check the passcode here."; return; }
  startSession(idOf(u));
}
async function createProfile() {
  const display = $('new-display').value.trim(), name = $('new-name').value.trim(), pass = $('new-pass').value, m = $('msg-lock');
  if (!display || display.length > 30) { m.textContent = 'Enter your name (up to 30 characters).'; return; }
  if (!USERNAME.test(name)) { m.textContent = 'Username: 3 to 20 letters, numbers, . _ -'; return; }
  if (byName(name)) { m.textContent = 'That username is already taken.'; return; }
  if (pass.length < 4) { m.textContent = 'A passcode needs at least 4 characters.'; return; }
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  let h;
  try { h = await hash(id, pass); } catch (e) { m.textContent = "Couldn't set a passcode here."; return; }
  const first = !users().length;
  if (!saveUsers(users().concat({id, name, display, h}))) { m.textContent = "Couldn't save in this browser."; return; }
  if (first) { // keep entries written before accounts existed
    uid = id;
    Object.keys(FIELDS).forEach(k => { const v = LS.get('qp_' + k); if (v) { LS.set(key(k), v); LS.del('qp_' + k); } });
    LS.del('qp_pass');
  }
  ['new-display', 'new-name', 'new-pass'].forEach(i => { $(i).value = ''; });
  startSession(id);
}
// ---- Bible quizzes ----
const QN = 10;
const CHAPS = [50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22];
const TRIVIA = [["Who built the ark?", "Noah", "Moses", "Abraham", "Jonah", "Noah obeyed God and built the ark to save his family and the animals from the flood (Genesis 6–9)."], ["Who was swallowed by a great fish?", "Jonah", "Elijah", "Daniel", "Peter", "Jonah ran from God's call to Nineveh, was swallowed by a great fish, and prayed from inside it (Jonah 1–2)."], ["Which disciple walked on water toward Jesus?", "Peter", "John", "Thomas", "Andrew", "Peter stepped out of the boat, but began to sink when he looked at the waves (Matthew 14:29–31)."], ["How many days did God spend creating before he rested?", "Six", "Seven", "Three", "Forty", "God created in six days and rested on the seventh (Genesis 1–2)."], ["Who was thrown into the lions' den?", "Daniel", "Joseph", "David", "Samson", "Daniel kept praying to God, and God shut the lions' mouths (Daniel 6)."], ["What did David use to defeat Goliath?", "A sling and a stone", "A sword", "A spear", "A bow and arrow", "David trusted the Lord and struck Goliath with a stone from his sling (1 Samuel 17)."], ["Who led the Israelites out of Egypt?", "Moses", "Joshua", "Aaron", "Abraham", "God used Moses to bring Israel out of slavery in Egypt (Exodus 3–14)."], ["In which town was Jesus born?", "Bethlehem", "Nazareth", "Jerusalem", "Capernaum", "Jesus was born in Bethlehem, as the prophet Micah foretold (Micah 5:2; Luke 2:4–7)."], ["How many disciples did Jesus choose to be his closest followers?", "Twelve", "Seven", "Ten", "Forty", "Jesus chose twelve disciples to be with him and to send out (Mark 3:13–19)."], ["Who betrayed Jesus for thirty pieces of silver?", "Judas Iscariot", "Peter", "Thomas", "Pilate", "Judas handed Jesus over to the chief priests for thirty pieces of silver (Matthew 26:14–16)."], ["Who was the first man God created?", "Adam", "Cain", "Noah", "Seth", "God formed Adam from the dust of the ground (Genesis 2:7)."], ["Which sea did God part so Israel could cross on dry ground?", "The Red Sea", "The Dead Sea", "The Sea of Galilee", "The Mediterranean Sea", "The Lord parted the Red Sea and Israel crossed on dry ground (Exodus 14)."], ["Who was the mother of Jesus?", "Mary", "Martha", "Elizabeth", "Ruth", "Mary was the young woman chosen to bear Jesus (Luke 1:26–38)."], ["Where did Jesus pray the night before he was arrested?", "Gethsemane", "Eden", "Bethany", "Gilgal", "Jesus prayed in the garden of Gethsemane (Matthew 26:36–46)."], ["Who wrote many of the New Testament letters, like Romans and Philippians?", "Paul", "Peter", "James", "Jude", "Paul wrote many letters to churches and friends that are now part of the New Testament."], ["How many plagues did God send on Egypt?", "Ten", "Seven", "Twelve", "Three", "Ten plagues, ending with the death of the firstborn, led Pharaoh to let Israel go (Exodus 7–12)."], ["Which woman risked her life to save her people from Haman's plot?", "Esther", "Ruth", "Deborah", "Naomi", "Queen Esther approached the king uninvited to plead for her people (Esther 4–8)."], ["Whose strength was tied to his uncut hair?", "Samson", "Gideon", "Saul", "Jonathan", "Samson was a Nazirite, and his long hair was a sign of his vow to God (Judges 13–16)."], ["What did God give Moses on Mount Sinai?", "The Ten Commandments", "The ark of the covenant", "Manna", "Plans for the temple", "God gave the Ten Commandments written on two stone tablets (Exodus 20; 31:18)."], ["Who anointed David to be the future king of Israel?", "Samuel", "Nathan", "Eli", "Elijah", "Samuel anointed the youngest son of Jesse, David (1 Samuel 16:1–13)."], ["Who baptized Jesus in the Jordan River?", "John the Baptist", "Peter", "Paul", "Philip", "John baptized Jesus, and the Spirit came down like a dove (Matthew 3:13–17)."], ["What did Jesus use to feed more than five thousand people?", "Five loaves and two fish", "Seven loaves and a few fish", "Manna from heaven", "Bread from the temple", "Jesus gave thanks for five loaves and two fish and fed the crowd (John 6:1–14)."], ["Who was Abraham's wife?", "Sarah", "Rebekah", "Rachel", "Leah", "Sarah gave birth to Isaac in her old age, as God had promised (Genesis 21:1–3)."], ["Which prophet was taken up to heaven in a whirlwind with chariots of fire?", "Elijah", "Elisha", "Isaiah", "Jeremiah", "Elijah went up in a whirlwind, and Elisha received his mantle (2 Kings 2:11–13)."], ["Who was sold by his brothers and later became a ruler in Egypt?", "Joseph", "Benjamin", "Reuben", "Judah", "Joseph forgave his brothers, saying God meant it for good (Genesis 37–50; 50:20)."], ["Which is the shortest verse in the English King James Bible?", "\"Jesus wept.\"", "\"God is love.\"", "\"Pray without ceasing.\"", "\"Be still.\"", "\"Jesus wept.\" (John 11:35) shows Jesus' compassion at the grave of his friend Lazarus."], ["Which disciple said he would not believe until he saw Jesus' wounds?", "Thomas", "Peter", "Philip", "Andrew", "Thomas then said, \"My Lord and my God\" (John 20:24–29)."], ["On which day did the women find Jesus' tomb empty?", "The first day of the week", "Friday", "Saturday", "Thursday", "They found the stone rolled away on the first day of the week (Luke 24:1–6)."], ["How many books are in the (Protestant) Bible?", "66", "39", "27", "72", "There are 39 Old Testament books and 27 New Testament books, making 66."], ["Who asked God for wisdom instead of riches?", "Solomon", "David", "Saul", "Hezekiah", "Solomon asked for an understanding heart, and God gave him wisdom and more (1 Kings 3:5–12)."], ["What was Jesus' first miracle in John's Gospel?", "Turning water into wine", "Healing a blind man", "Walking on water", "Feeding the five thousand", "At the wedding in Cana, Jesus turned water into wine (John 2:1–11)."], ["Who denied knowing Jesus three times?", "Peter", "Judas", "John", "Thomas", "Peter wept bitterly, and Jesus later restored him (Luke 22:54–62; John 21:15–17)."], ["Where was Saul when Jesus appeared to him in a bright light?", "On the road to Damascus", "In Jerusalem", "In Rome", "In Antioch", "Saul became Paul, the apostle to the Gentiles (Acts 9:1–19)."], ["What did Jesus call the greatest commandment?", "Love the Lord your God with all your heart", "Keep the Sabbath", "Honor your father and mother", "Do not steal", "Jesus said to love God with all your heart, soul and mind (Matthew 22:37–38)."]];
const STOP = new Set(['shall','which','their','these','those','there','unto','thee','thou','thy','thine','with','from','have','will','that','this','them','they','were','your','also','into','upon','being','hath','doth','said','saith','before','because','would','could','should','where','when','what','whom','whose','every','other']);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const k = rnd(i + 1); [a[i], a[k]] = [a[k], a[i]]; } return a; };
const section = b => b < 5 ? 'a book of the Law (Old Testament)' : b < 17 ? 'a history book (Old Testament)' : b < 22 ? 'a wisdom and poetry book (Old Testament)' : b < 27 ? 'a Major Prophets book (Old Testament)' : b < 39 ? 'a Minor Prophets book (Old Testament)' : b < 43 ? 'a Gospel (New Testament)' : b === 43 ? 'the story of the early church (New Testament)' : b < 57 ? "one of Paul's letters (New Testament)" : b < 65 ? 'one of the General Letters (New Testament)' : 'the book of prophecy that closes the New Testament';
const vref = v => v[0] + ' ' + v[1] + ':' + v[2] + (v[3] ? '-' + v[3] : '');
const word = w => w.replace(/[^A-Za-z']/g, '');
const goodWord = w => word(w).length >= 5 && !STOP.has(word(w).toLowerCase());
const others = (b, same) => shuffle(BOOKS.map((n, i) => i).filter(i => i !== b && (!same || (i >= 39) === (b >= 39)))).slice(0, 3).map(i => BOOKS[i]);
function triviaQ() {
  if (Math.random() < .45) { const i = rnd(TRIVIA.length), t = TRIVIA[i]; return {id:'t' + i, q:t[0], opts:t.slice(1, 5), why:t[5]}; }
  const b = rnd(66), kind = rnd(3), name = BOOKS[b];
  if (kind === 0 && b < 65) return {id:'n' + b + 'a', q:'Which book comes right after ' + name + '?', opts:[BOOKS[b + 1]].concat(others(b + 1, false).filter(n => n !== name)).slice(0, 4), why:BOOKS[b + 1] + ' comes right after ' + name + ' in the Bible.'};
  if (kind === 1) {
    const set = new Set([CHAPS[b]]);
    while (set.size < 4) { const n = CHAPS[b] + rnd(25) - 12; if (n > 0) set.add(n); }
    return {id:'n' + b + 'b', q:'How many chapters does ' + name + ' have?', opts:[...set].map(String), why:name + ' has ' + CHAPS[b] + ' chapter' + (CHAPS[b] > 1 ? 's' : '') + '.'};
  }
  const nt = b >= 39;
  return {id:'n' + b + 'c', q:'Is ' + name + ' in the Old Testament or the New Testament?', opts:[nt ? 'New Testament' : 'Old Testament', nt ? 'Old Testament' : 'New Testament'], why:name + ' is ' + section(b) + '.'};
}
function verseQ() {
  const i = rnd(VOTD.length), v = VOTD[i], words = v[4].split(/\s+/), cand = words.map((w, k) => k).filter(k => goodWord(words[k]));
  if (!cand.length) return null;
  const k = cand[rnd(cand.length)], target = word(words[k]), cap = /^[A-Z]/.test(target), opts = [target];
  for (let n = 0; n < 300 && opts.length < 4; n++) {
    const ow = VOTD[rnd(VOTD.length)][4].split(/\s+/).filter(goodWord);
    if (!ow.length) continue;
    let w = word(ow[rnd(ow.length)]).toLowerCase(); if (cap) w = w[0].toUpperCase() + w.slice(1);
    if (w.toLowerCase() !== target.toLowerCase() && Math.abs(w.length - target.length) <= 2 && !opts.some(o => o.toLowerCase() === w.toLowerCase())) opts.push(w);
  }
  if (opts.length < 4) return null;
  return {id:'v' + i, q:'Complete the verse:\n"' + words.map((w, j) => j === k ? w.replace(target, '_____') : w).join(' ') + '"', opts, why:vref(v) + ' (KJV): "' + v[4] + '"'};
}
function bookQ() {
  const i = rnd(VOTD.length), v = VOTD[i], b = BOOKS.indexOf(v[0]);
  return {id:'b' + i, q:'Which book is this verse from?\n"' + v[4] + '"', opts:[v[0]].concat(others(b, true)), why:vref(v) + ' — ' + v[0] + ' is ' + section(b) + '.'};
}
const MAKERS = {trivia:triviaQ, verse:verseQ, book:bookQ}, POOL = {trivia:() => TRIVIA.length + 198, verse:() => VOTD.length, book:() => VOTD.length};
let quiz = null;
function makeQ() { // never repeats a question until the whole pool has been played
  const g = quiz.g, k = key('seen_' + g); let seen;
  try { seen = new Set(JSON.parse(LS.get(k)) || []); } catch (e) { seen = new Set(); }
  if (seen.size >= POOL[g]() - 8) seen.clear();
  let q = null;
  for (let n = 0; n < 400 && !q; n++) { const c = MAKERS[g](); if (c && !seen.has(c.id) && !quiz.ids.has(c.id)) q = c; }
  while (!q) q = MAKERS[g]();
  seen.add(q.id); quiz.ids.add(q.id); LS.set(k, JSON.stringify([...seen]));
  return q;
}
async function startQuiz(g) {
  if (g !== 'trivia') { try { await votd(); } catch (e) { $('quiz-menu').insertAdjacentText('beforeend', 'This game needs an internet connection the first time.'); return; } }
  else { try { await votd(); } catch (e) {} }
  quiz = {g, i:0, score:0, ids:new Set(), done:false};
  $('quiz-menu').hidden = true; $('quiz-play').hidden = false;
  showQ();
}
function quitQuiz() { $('quiz-play').hidden = true; $('quiz-menu').hidden = false; quiz = null; }
function showQ() {
  $('q-why').hidden = true; $('q-next').hidden = true; $('q-opts').hidden = false;
  const q = quiz.q = makeQ();
  quiz.correct = q.opts[0];
  $('q-n').textContent = 'Question ' + (quiz.i + 1) + ' of ' + QN;
  $('q-score').textContent = '⭐ ' + quiz.score;
  $('q-bar').style.width = (quiz.i / QN * 100) + '%';
  $('q-text').textContent = q.q;
  const box = $('q-opts'); box.textContent = '';
  shuffle(q.opts.slice()).forEach(o => {
    const b = document.createElement('button'); b.className = 'qopt'; b.textContent = o;
    b.onclick = () => answerQ(b, o); box.appendChild(b);
  });
}
function answerQ(btn, o) {
  const good = o === quiz.correct;
  document.querySelectorAll('#q-opts .qopt').forEach(b => { b.disabled = true; if (b.textContent === quiz.correct) b.classList.add('good'); });
  if (!good) btn.classList.add('bad'); else quiz.score++;
  $('q-score').textContent = '⭐ ' + quiz.score;
  $('q-why').textContent = (good ? '✓ Correct! ' : '✗ The answer is ' + quiz.correct + '. ') + quiz.q.why;
  $('q-why').hidden = false;
  $('q-next').textContent = quiz.i + 1 >= QN ? 'See my score' : 'Next ▶'; $('q-next').hidden = false;
}
function nextQ() {
  if (quiz.done) { startQuiz(quiz.g); return; }
  if (++quiz.i < QN) { showQ(); return; }
  quiz.done = true;
  const bk = key('best_' + quiz.g), best = Math.max(+LS.get(bk) || 0, quiz.score); LS.set(bk, best);
  const s = quiz.score;
  $('q-bar').style.width = '100%'; $('q-n').textContent = 'Round finished'; $('q-score').textContent = '⭐ ' + s;
  $('q-text').textContent = 'You got ' + s + ' out of ' + QN + '!\n' + (s >= 9 ? 'Amazing! You really know your Bible ♡' : s >= 7 ? 'Great job! Keep growing ♡' : s >= 4 ? 'Nice try! Every round teaches something ♡' : 'Good start! Read a little and try again ♡') + '\nYour best: ' + best + '/' + QN;
  $('q-opts').hidden = true; $('q-why').hidden = true;
  $('q-next').textContent = 'Play again ↻'; $('q-next').hidden = false;
}

// ---- Review bubbles on the login screen ----
const REVIEWS = ["I love the colors and design also the devotion reminder.", "This is so cute", "I like that I can change the color and theme of the website.", "I like the part where in I can put a song link and it plays the song while I can still write my devotions while the song is playing.", "I like the Bible Study cause you can literally learn the content of the scripture. More improvement to the website."];
let chatI = 0; const usedSlots = new Set();
function chatLoop() { // review bubbles pop up all around the login box, then fade away
  const box = $('chat');
  if (!document.documentElement.classList.contains('locked')) { box.textContent = ''; usedSlots.clear(); setTimeout(chatLoop, 1500); return; }
  const lb = document.querySelector('.lockbox').getBoundingClientRect(), W = innerWidth, H = innerHeight, fl = lb.left - 24, fr = W - lb.right - 24;
  const slots = [];
  if (fl >= 190) [.07, .28, .5, .74].forEach(t => slots.push([0, t]));
  if (fr >= 190) [.13, .36, .6, .8].forEach(t => slots.push([1, t]));
  if (!slots.length) [.03, .9].forEach(t => slots.push([2, t]));
  const free = slots.map((s, i) => i).filter(i => !usedSlots.has(i));
  if (!free.length || box.children.length >= 3) { setTimeout(chatLoop, 900); return; }
  const si = free[rnd(free.length)], col = slots[si][0], text = REVIEWS[chatI++ % REVIEWS.length], hold = 3600 + text.length * 45;
  const room = col === 0 ? fl : col === 1 ? fr : W - 24, w = Math.min(320, room - 8);
  const b = document.createElement('div'), s = document.createElement('small'), p = document.createElement('p');
  b.className = 'bubble'; b.style.width = w + 'px'; b.style.setProperty('--rot', (rnd(5) - 2) + 'deg');
  b.style.left = (col === 0 ? 12 + rnd(Math.max(1, fl - w - 12)) : col === 1 ? lb.right + 24 + rnd(Math.max(1, fr - w - 8)) : (W - w) / 2) + 'px';
  b.style.top = Math.round(slots[si][1] * H + rnd(26)) + 'px';
  usedSlots.add(si);
  s.textContent = '💬 Review'; p.className = 'dots';
  for (let i = 0; i < 3; i++) p.appendChild(document.createElement('i'));
  b.append(s, p); box.appendChild(b);
  setTimeout(() => { p.className = ''; p.textContent = text; }, 1100);
  setTimeout(() => b.classList.add('out'), 1100 + hold);
  setTimeout(() => { b.remove(); usedSlots.delete(si); }, 1700 + hold);
  setTimeout(chatLoop, 1700 + rnd(1600));
}

// ---- Username warning, cat friend and cat cursor ----
function checkName(id, msgId) {
  const v = $(id).value.trim(), o = v && byName(v);
  $(msgId).textContent = o && idOf(o) !== uid ? '⚠ That username is already taken on this browser. Try another one.' : '';
}
const catOn = () => LS.get('qp_cat') !== '0';
const setCatClass = () => document.documentElement.classList.toggle('nocat', !catOn());
function setCat() { LS.set('qp_cat', $('cat-on').checked ? '1' : '0'); setCatClass(); placeCat(); }
const cat = {x:0, y:0, tx:0, ty:0, side:0, seen:false, state:'sit', until:0, next:0, idleSince:0, last:0};
const CAT = 72;
function catState(s) { if (cat.state !== s) { cat.state = s; $('cat').className = 's-' + s; } }
function placeCat() {
  const r = document.querySelector('.site').getBoundingClientRect(), W = innerWidth, L = r.left, R = W - r.right, need = CAT + 20, el = $('cat');
  if (!catOn() || Math.max(L, R) < need) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  if (!cat.seen) { cat.seen = true; cat.side = L >= need ? 1 : 2; cat.x = cat.tx = cat.side === 1 ? Math.max(4, L / 2 - CAT / 2) : r.right + (R - CAT) / 2; cat.y = cat.ty = innerHeight - CAT - 24; }
}
function moveCat(e) { // follows only while the cursor is on the tiles; over the site the cat stays where it was left
  const r = document.querySelector('.site').getBoundingClientRect(), W = innerWidth, L = r.left, R = W - r.right, need = CAT + 20;
  if (!catOn() || Math.max(L, R) < need) { $('cat').style.display = 'none'; return; }
  $('cat').style.display = 'block';
  const left = e.clientX < r.left - 6 && L >= need, right = e.clientX > r.right + 6 && R >= need;
  if (!left && !right) return;
  const side = left ? 1 : 2;
  cat.tx = left ? Math.min(Math.max(e.clientX - CAT / 2, 4), L - CAT - 6) : Math.min(Math.max(e.clientX - CAT / 2, r.right + 6), W - CAT - 4);
  cat.ty = Math.min(Math.max(e.clientY - CAT * .6, 0), innerHeight - CAT - 4);
  if (!cat.seen || cat.side !== side) { cat.x = cat.tx; cat.y = cat.ty; cat.seen = true; }
  cat.side = side; cat.last = performance.now();
}
function tickCat(t) {
  const dx = cat.tx - cat.x, dy = cat.ty - cat.y;
  cat.x += dx * .09; cat.y += dy * .09;
  if (Math.hypot(dx, dy) > 8 && t - cat.last < 700) { catState('walk'); cat.idleSince = 0; }
  else if (cat.state === 'walk') { catState('sit'); cat.idleSince = t; cat.next = t + 1800; }
  else if (!cat.idleSince) { cat.idleSince = t; cat.next = t + 1500; }
  else if (cat.state !== 'sit' && t > cat.until) { catState('sit'); cat.next = t + 2200 + Math.random() * 2800; }
  else if (cat.state === 'sit' && t > cat.next) {
    const pick = t - cat.idleSince > 12000 && Math.random() < .5 ? 'sleep' : ['yawn', 'happy', 'curious', 'happy'][rnd(4)];
    catState(pick); cat.until = t + ({curious:2800, yawn:2600, happy:2600, sleep:9000})[pick];
  }
  $('cat').style.transform = 'translate(' + cat.x + 'px,' + cat.y + 'px)';
  requestAnimationFrame(tickCat);
}
function initExtras() {
  const bk = $('bk');
  BOOKS.forEach((n, i) => { const o = document.createElement('option'); o.value = i; o.textContent = n; bk.appendChild(o); });
  $('rv').innerHTML = $('ver').innerHTML;
  setCatClass();
  placeCat();
  addEventListener('resize', placeCat);
  setTimeout(chatLoop, 900);
  if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
    document.addEventListener('mousemove', moveCat);
    requestAnimationFrame(tickCat);
  }
}
function boot() {
  initExtras();
  const sw = $('swatches');
  if (!sw.children.length) ['#f58ab3', '#b79cf0', '#6fb7f2', '#a8d93f', '#f4a261', '#e86a6a'].forEach(c => {
    const b = document.createElement('button'); b.style.background = c; b.title = c; b.onclick = () => setTheme(c); sw.appendChild(b);
  });
  const last = LS.get('qp_last'), u = last && users().find(x => idOf(x) === last || x.name === last);
  if (u) startSession(idOf(u)); else showLogin();
}
boot();
