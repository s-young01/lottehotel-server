// common js 구문
// 모듈 import -> require('모듈')
// express
const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const multer = require('multer');
const bcrypt = require('bcrypt');
const saltRounds = 10;

// 서버 생성
const app = express();

// 프로세서의 주소 (포트번호) 지정
const port = 8080;

// 브라우져의 cors 이슈를 막기 위해 설정
app.use(cors());
// json 형식 데이터 처리하도록 설정
app.use(express.json());
// upload폴더 클라이언트에서 접근 가능하도록 설정
app.use('/upload', express.static('upload'));

// storage 생성
// diskStorage : 이미지를 저장해주는 저장소 역할을 함
const storage = multer.diskStorage({
    // 어디에 저장할지 경로를 설정.
    destination: (req, file, cd) => {
        cd(null, 'upload/event/');
    },
    filename: (req, file, cd) => {
        // 파일 이름은 직접 지정한 이름으로 저장하도록 설정.
        const newFilename = file.originalname;
        cd(null, newFilename);
    }
});
// upload객체 생성
const upload = multer({storage: storage});
// upload경로로 post요청 왔을 시 응답 구현
// .single('') : 지정한 경로로 요청이 왔을 때 객체의key이름을 받아 처리해서 넣어줌
app.post('/upload', upload.single('file'), (req, res) => {
    res.send({
        imgUrl: req.file.filename
    });
});

// mysql연결선 생성
const conn  = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234',
    port: '3306',
    database: 'hotel'
});
// mysql선 연결
conn.connect();

// get 요청 방식
// conn.query('쿼리문', 콜백함수) : 쿼리문 보내기
app.get('/specials/:limits', (req, res) => {
    const {limits} = req.params;
    conn.query(`select * from event where e_category = 'special' limit ${limits}`, 
    (error, result, fields) => {
        res.send(result);
    });
});
app.get('/special/:no', (req, res) => {
    const {no} = req.params; // req : {params : {no : 1}}
    conn.query(`select * from event where e_category='special' and e_no=${no}`,
    (error, result, fields) => {
        res.send(result);
    });
});

// 객실 데이터 get 요청
app.get('/room', (req, res) => {
    conn.query('select * from guestroom', (error, result, fields) => {
        res.send(result);
    });
});

// 회원가입 요청
app.post('/join', async (req, res) => {
    // 입력받은 비밀번호를 mytextpass로 할당
    const mytextpass = req.body.m_pass;
    let mypass = '';
    const {m_name, m_pass, m_email, m_nickname, 
        m_phone, m_address1, m_address2} = req.body;
        console.log(req.body);
        // 입력받은 비밀번호가 빈문자열이 아니고, undefined가 아닐 때,
        if(mytextpass !== '' && mytextpass != undefined) {
            bcrypt.genSalt(saltRounds, function(err, salt) {
            bcrypt.hash(mytextpass, salt, function(err, hash) {
                // hash메서드 호출되면 인자로 넣어준 비밀번호를 암호화 해
                // 콜백함수 안 hash로 돌려준다. 
                mypass = hash;
                // 쿼리 작성
                // insert into 테이블명(컬럼명) values(${})
                conn.query(`insert into member(m_name, m_pass, m_email, m_nickname, m_phone, m_address1, m_address2) 
                values('${m_name}','${mypass}','${m_email}','${m_nickname}','${m_phone}','${m_address1}','${m_address2}')`, 
                (err, result, fields) => {
                if(result) {
                    res.send('등록되었습니다.');
                }
                    console.log(err);
                });
            });
        });
    }
});

// 로그인 요청
app.post('/login', async (req, res) => {
    // 1) useremail 값에 일치하는 데이터가 있는지 확인
    // 2) userpass를 암호화해서 쿼리 결과의 패스워드와 일치하는지 확인
    const {useremail, userpass} = req.body;
    conn.query(`select * from member where m_email = '${useremail}'`, (err, result, fields) => {
        // 결과가 undefined가 아니고, 결과의 0번째가 undefined가 아닐 때
        if(result != undefined && result[0] != undefined) {
            bcrypt.compare(userpass, result[0].m_pass, function(err, rese) {
                // result : 쿼리결과
                // rese : 패스워드 결과
                if(rese) {
                    console.log('로그인 성공');
                    res.send(result);
                }else {
                    console.log('로그인 실패');
                }
            }) 
        }else {
            console.log('데이터가 없습니다.');
        }
    })
});

// 아이디 찾기 요청
app.post('/findid', async (req, res) => {
    const {m_name, m_phone} = req.body;
    conn.query(`select * from member where m_name='${m_name}' and m_phone='${m_phone}'`, (err, result, fields) => {
        if(result) {
            res.send(result[0].m_email);
        } 
        console.log(err);
    })
})

// 비밀번호 찾기 요청
app.post('/findpass', async (req, res) => {
    const {m_name, m_email} = req.body;
    conn.query(`select * from member where m_name='${m_name}' and m_email='${m_email}'`, (err, result, fields) => {
        if(result) {
           res.send(result[0].m_email);
        } 
        console.log(err);
    })
})

// 비밀번호 변경 요청
app.patch('/updatepass', async (req, res) => {
    const {m_pass, m_email} = req.body;
    const mytextpass = m_pass;
    let mypass = '';
    if(mytextpass !== '' && mytextpass != undefined) {
        bcrypt.genSalt(saltRounds, function(err, salt) {
        bcrypt.hash(mytextpass, salt, function(err, hash) {
            // hash메서드 호출되면 인자로 넣어준 비밀번호를 암호화 해
            // 콜백함수 안 hash로 돌려준다. 
            mypass = hash;
            // 쿼리 작성
            // update 테이블 이름 set 필드이름 = 데이터 값 where조건
            conn.query(`update member set m_pass='${mypass}' where m_email='${m_email}'`, 
            (err, result, fields) => {
                if(result) {
                    console.log(result);
                    res.send('업데이트 되었습니다.');
                }
                    console.log(err);
                });
            });
        });
    }
})

// 이벤트 등록 요청
app.post('/event', async (req, res) => {
    const {e_title, e_time, e_titledesc, 
        e_category, e_img1, e_img2, e_desc} = req.body;
    // 쿼리문 작성 1) insert into 테이블이름(필드명...) values(값...)
    // 2) insert into 테이블이름(필드명...) values(?,...), [변수명, ...]
    conn.query(`insert into event(e_title, e_time, e_titledesc, e_category, e_img1, e_img2, e_desc) values(?,?,?,?,?,?,?)`, 
    [e_title, e_time, e_titledesc, e_category, e_img1, e_img2, e_desc], (err, result, fields) => {
        if(result) {
            console.log(result);
            res.send('OK');
        }else {
            console.log(err);
        }
    });
});

// 객실 등록 요청
app.post('/room', async (req, res) => {
    const {r_name, r_size, r_price, r_bed, r_amenity, 
        r_desc, r_img1, r_img2, r_img3, r_img4} = req.body;
    // 쿼리문 작성
    conn.query(`insert into guestroom(r_name, r_size, r_price, r_bed, r_amenity, r_desc, r_img1, r_img2, r_img3, r_img4) values(?,?,?,?,?,?,?,?,?,?)`,
    [r_name, r_size, r_price, r_bed, r_amenity, r_desc, r_img1, r_img2, r_img3, r_img4], (err, result, fields) => {
        if(result) {
            console.log(result);
            res.send('OK');
        }else {
            console.log(err);
        }
    });
});

app.listen(port, () => {
    console.log('서버가 작동중입니다.');
})