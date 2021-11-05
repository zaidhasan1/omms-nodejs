const dbHelper = require("../config/dbHelper")
const sha1 = require("sha1")
const moment = require("moment")
const fs = require("fs")
const dir = "./uploads/";

const nullFields = "Some required fields null ";
const Applicant = {}

Applicant.date = () => {
    let datetime = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    console.log(datetime);
    return datetime;
}

Applicant.authorityCheckRegistration = (id) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT * FROM registrations WHERE registration_approved = ? AND registration_id = ?`
        dbHelper.query(query, [1, id], (err, result, fields) => {
            if (result.length) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

Applicant.registrationNumberCreator = async () => {
    return new Promise((resolve, reject) => {
        dbHelper.connect((err) => {
            let query = `SELECT * FROM registrations ORDER BY registration_id DESC LIMIT 1 `;
            dbHelper.query(query, null, (err, results, fields) => {
                if (err) throw  reject(0)
                const getId = parseInt(results[0].registration_id) + 1;
                const newId = `BMC${String(getId).padStart(6, '0')}`
                resolve(newId);
            })
        })
    })

}

Applicant.omdUniqueId = () => {
    return new Promise((resolve, reject) => {
        dbHelper.connect((err) => {
            let query = `SELECT * FROM omd_application ORDER BY omd_app_id DESC LIMIT 1 `;
            dbHelper.query(query, null, (err, results, fields) => {
                if (err) throw  reject(0)
                const getId = parseInt(results[0].omd_app_id) + 1;
                const newId = `OMD${String(getId).padStart(6, '0')}`
                resolve(newId);
            })
        })
    })

}

Applicant.registrationData = (id) => {
    return new Promise((resolve, reject) => {
        dbHelper.connect((err) => {
            dbHelper.query(`SELECT * FROM registrations WHERE registration_id = ?`, [id], (err, result1, fields) => {
                const re = result1[0];
                resolve({
                    registration_id: re.registration_id,
                    applicant_name: re.registration_applicant_name,
                    zone: re.registration_zone,
                    ward: re.registration_ward,
                    type: re.registration_type,
                    login: re.registration_login,
                    address: re.registration_address,
                    gst: re.registration_gst,
                    pan: re.registraiton_pancard,
                    pincode: re.registration_pincode,
                    email: re.registration_email,
                    mobile: re.registration_mobile,
                    agency_name: re.agency_name,
                    agency_email: re.agency_email
                });
            })
        })
    });
}

Applicant.registration = async (req, res) => {

    const body = req.body;
    const applicantName = body.applicant_name;
    const password = body.password;
    const username = body.username;
    const applicantType = body.applicant_type;
    const mobile = body.mobile;
    const email = body.email;

    if (mobile && email && applicantName && password && username && applicantType) {

        let registrationNumber = await Applicant.registrationNumberCreator();
        let passwordCreator = sha1(`${password}${process.env.SALT}`)

        let checkUsername = await Applicant.checkUserName(username);
        let checkEmail = await Applicant.checkEmailAddress(email)
        let checkMobile = await Applicant.checkMobileNumber(mobile);

        if (checkUsername.ack == 1) {
            if (checkEmail.ack == 1) {
                if (checkMobile.ack == 1) {
                    dbHelper.connect((err) => {

                        let insertQuery = `INSERT INTO registrations (registration_number,registration_login,registration_mobile,registration_email,registration_applicant_name,registration_type,registration_password) VALUES ('${registrationNumber}','${username}','${mobile}','${email}','${applicantName}','${applicantType}','${passwordCreator}')`

                        dbHelper.query(insertQuery, async (err, results, fields) => {
                            let insertId = results.insertId;

                            res.status(200).json({
                                ack: 1,
                                msg: "registration has completed ",
                                id: registrationNumber,
                                role: "user",
                                data: await Applicant.registrationData(insertId)
                            });
                        })
                    });
                } else {
                    res.status(200).json({
                        ack: 0,
                        msg: checkMobile.msg
                    })
                }
            } else {
                res.status(200).json({
                    ack: 0,
                    msg: checkEmail.msg
                })
            }
        } else {
            res.status(200).json({
                ack: 0,
                msg: checkUsername.msg
            })
        }

    } else {
        res.status(200).json({
            ack: 0,
            msg: nullFields
        })
    }
}

Applicant.login = async (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    if (username && password) {

        let passwords = sha1(`${password}${process.env.SALT}`);
        let query = `SELECT * FROM registrations WHERE (registration_login = ? OR registration_number = ?) AND registration_password = ? `
        let replacements = [username, username, passwords]

        dbHelper.query(query, replacements, async (err, results, fields) => {
            if (results.length) {
                res.status(200).json({
                    ack: 1,
                    msg: "user has logged in successfully ",
                    id: results[0].registration_number,
                    role: "user",
                    data: await Applicant.registrationData(results[0].registration_id)
                });
            } else {
                res.status(200).json({
                    ack: 0,
                    msg: `username and password did not match.`
                })
            }
        });

    } else {
        res.status(200).json({
            ack: 0,
            msg: "username and password not found."
        })
    }
}

Applicant.insertApplicationStatus = (appStatusFor, appStatusForId, appStatusMarkBy, appStatusPosition, appStatusRemark, statusIp) => {
    return new Promise((resolve, reject) => {
        let query1 = `INSERT INTO application_status SET ?`
        let data = {
            app_status_for: appStatusFor,
            app_status_appid: appStatusForId,
            app_status_mark_by: appStatusMarkBy,
            app_status_position: appStatusPosition,
            app_status_remark: appStatusRemark,
            app_status_ip: statusIp,
            app_status_date: Applicant.date()
        }

        dbHelper.query(query1, data, (err, result, fields) => {
            resolve(result.insertId)
        })

    });

}

Applicant.applyOmdApplication = async (req, res) => {
    const body = req.body;
    const typologyId = body.typology_id;
    const subTypologyId = body.sub_typology_id;
    const omdFormat = body.omd_format;
    const installationType = body.installation_type;
    const width = body.width;
    const height = body.height;
    const duration = body.duration;
    const sided = body.sided;
    const illumination = body.illumination;
    const illuminationDescription = body.illumination_description;
    const address = body.address;
    const zone = body.zone;
    const ward = body.ward;
    const pincode = body.pincode;
    const regId = body.reg_id;
    const description = body.description;

    if (typologyId && omdFormat && installationType && width && height && duration && sided && illumination && address && zone && ward && pincode) {

        let omdUniqueId = await Applicant.omdUniqueId()
        const ip = JSON.stringify(req.socket.remoteAddress) || ""

        dbHelper.connect(async (err) => {

            const getOmdLastId = new Promise((resolve, reject) => {
                dbHelper.query(`SELECT * FROM omd_application ORDER BY omd_app_id DESC LIMIT 1`, null, (err, results, fields) => {
                    const id = parseInt(results[0].omd_app_id) + 1;
                    resolve(id)
                })
            })

            const lastId = await getOmdLastId;

            const appStatusId = await Applicant.insertApplicationStatus("OMD", lastId, "1", "Applicant", "Omd Application registration ", ip);

            let data = {
                omd_uniqueid: omdUniqueId,
                omd_app_regid: regId,
                omd_app_address: address,
                omd_app_pincode: pincode,
                omd_app_zone: zone,
                omd_app_ward: ward,
                omd_app_typology: typologyId,
                omd_app_subcategory: subTypologyId,
                omd_app_illumination: illumination == 0 ? "N" : "Y",
                omd_app_illumination_des: illuminationDescription,
                omd_app_description: description,
                omd_app_sides: sided,
                omd_app_width: width,
                omd_app_height: height,
                omd_app_format: omdFormat,
                omd_app_installation_type: installationType,
                omd_app_duration: duration,
                omd_app_ip: ip,
                omd_app_status: appStatusId,
                omd_app_datetime : Applicant.date()
            }

            let query = `INSERT INTO omd_application SET ? `;
            dbHelper.query(query, data, (err, results, fields) => {
                res.status(200).json({
                    ack: 1,
                    msg: "you omd application has registered "
                })
            });
        })

    } else {
        res.status(200).json({
            ack: 0,
            msg: "empty Fields "
        })
    }
}

Applicant.editRegistration = async (req, res) => {

    const body = req.body
    const applicantName = body.applicant_name;
    const address = body.address;
    const zone = body.zone;
    const ward = body.ward;
    const pincode = body.pincode;
    const adharNo = body.adhar_no;
    const panNo = body.pan_no;
    const alternateMobile = body.alternate_mobile;
    const gst = body.gst;
    const agencyName = body.agency_name;
    const agencyEmail = body.agency_email
    const id = body.id; //registration_number

    if (applicantName && address && zone && ward && pincode && adharNo && panNo && alternateMobile && gst && agencyName) {

        const date = Applicant.date();

        const query = ` UPDATE registrations SET 
                        registration_applicant_name='${applicantName}',
                        registration_address='${address}',
                        registration_zone='${zone}',
                        registration_ward='${ward}',
                        registration_pincode='${pincode}',
                        registration_adhar='${adharNo}',
                        registration_pan='${panNo}',
                        registration_alternate_mobile='${alternateMobile}',
                        registration_gst='${gst}',
                        agency_name='${agencyName}',
                        agency_email = '${agencyEmail}'
                        WHERE registration_number='${id}' `

        if (await Applicant.authorityCheckRegistration(id)) {

            res.status(200).json({
                ack: 0,
                msg: "you cannot make change after 'registration approved' "
            })

        } else {
            dbHelper.query(query, null, (err, results, fields) => {
                res.status(200).json({
                    ack: 1,
                    msg: "registration has updated successfully "
                })
            });
        }

    } else {
        res.status(200).json({
            ack: 0,
            msg: "Fields Are empty "
        })
    }

}

Applicant.editProfile = (req, res) => {

}

Applicant.verifyMobile = (req, res) => {

}

Applicant.verifyEmail = (req, res) => {

}

Applicant.getEmi = (req, res) => {

}

Applicant.getOmdApplication = (req, res) => {

}

Applicant.getRegistration = (req, res) => {

    let regId = req.body.id; //registration id
    if (regId) {

        console.log(req.body);

        dbHelper.connect((err) => {
            let query = `SELECT * FROM registrations WHERE registration_number = ?`;
            dbHelper.query(query, [regId], (err, results, fields) => {
                res.status(200).json({
                    ack: 1,
                    msg: "success",
                    data: results[0]
                })
            });
        });

    } else {
        res.status(200).json({
            ack: 0,
            msg: "empty Fields "
        })
    }

}

Applicant.checkValidUser = (username) => {
    /*
      Usernames can only have:
      - Lowercase Letters (a-z)
      - Numbers (0-9)
      - Dots (.)
      - Underscores (_)
    */
    const res = /^[a-z0-9_\.]+$/.exec(username);
    const valid = !!res;
    return valid;
}

Applicant.checkUserName = (username) => {

    return new Promise((resolve, reject) => {

        let checkUser = Applicant.checkValidUser(username);
        if (checkUser) {
            const query = `SELECT * FROM registrations WHERE registration_login = ? `;
            const replacement = [username];
            dbHelper.connect((err) => {
                dbHelper.query(query, replacement, (err, results, fields) => {

                    if (results.length) {
                        resolve({
                            ack: 0,
                            msg: " this username already exists "
                        });
                    } else {
                        resolve({
                            ack: 1,
                            msg: "you can take this username "
                        });
                    }
                })
            })
        } else {
            resolve({
                ack: 0,
                msg: "username not valid "
            })
        }


    })

}

Applicant.checkMobileNumber = (mobile) => {

    return new Promise((resolve, reject) => {

        const query = `SELECT * FROM registrations WHERE registration_mobile = ? `;
        const replacement = [mobile];
        dbHelper.connect((err) => {
            dbHelper.query(query, replacement, (err, results, fields) => {

                if (results.length) {
                    resolve({
                        ack: 0,
                        msg: " this Mobile already exists "
                    })
                } else {
                    resolve({
                        ack: 1,
                        msg: "you can take this Mobile "
                    })
                }
            })
        })

    })


}

Applicant.checkEmailAddress = (email) => {

    return new Promise((resolve, reject) => {

        const query = `SELECT * FROM registrations WHERE registration_email = ? `;
        const replacement = [email];
        dbHelper.connect((err) => {
            dbHelper.query(query, replacement, (err, results, fields) => {

                if (results.length) {
                    resolve({
                        ack: 0,
                        msg: " this email already exists "
                    })
                } else {
                    resolve({
                        ack: 1,
                        msg: "you can take this email "
                    })
                }
            })
        })

    })

}

Applicant.getZone = (req, res) => {
    dbHelper.connect((err) => {
        let query = `SELECT * FROM zoneward GROUP BY zone_no`
        dbHelper.query(query, null, (err, results, fields) => {
            if (results.length) {
                res.status(200).json({
                    ack: 1,
                    msg: "success",
                    data: results
                })
            } else {
                res.status(200).json({
                    ack: 0,
                    msg: "no Zone Available "
                })
            }
        });
    })
}

Applicant.getWard = (req, res) => {
    let zone = req.body.zone;
    if (zone) {
        dbHelper.connect((err) => {
            let query = `SELECT * FROM zoneward WHERE zone_no = ?`
            dbHelper.query(query, [zone], (err, results, fields) => {
                if (results.length) {
                    res.status(200).json({
                        ack: 1,
                        msg: "success",
                        data: results
                    })
                } else {
                    res.status(200).json({
                        ack: 0,
                        msg: "no Ward Available "
                    })
                }
            });
        })
    } else {
        res.status(200).json({
            ack: 0,
            msg: "empty Fields "
        })
    }
}

Applicant.sendMobileLink = (req, res) => {
    const mobile = req.body.mobile;
    if (mobile) {


    } else {
        res.status(200).json({
            ack: 0,
            msg: "Empty Fields "
        })
    }
}

Applicant.sendEmailLink = (req, res) => {
    const email = req.body.email;
    if (email) {
        res.status(200).json({
            ack: 1,
            msg: "Email link has shared "
        })
    } else {
        res.status(200).json({
            ack: 0,
            msg: "Empty Fields"
        })
    }
}

Applicant.getReqDocument = (req, res) => {

    //registration_id
    const id = req.body.id;
    const fors = req.body.fors;
    const typologyId = req.body.typology_id
    if (id) {
        dbHelper.connect(async (err) => {

            const data1 = new Promise((resolve, reject) => {
                let query = `select  *from required_document_type WHERE required_document_for = ? AND typology=? `
                let replacements = [fors, typologyId];
                dbHelper.query(query, replacements, (err, results, fields) => {
                    resolve(results);
                })
            });

            const data2 = new Promise((resolve, reject) => {
                let query = `SELECT  *FROM documents WHERE document_parent = ? AND document_for = ?`;
                let replacements = [id, fors];
                dbHelper.query(query, replacements, (err, results, fields) => {
                    resolve(results);
                })
            });

            res.status(200).json({
                ack: 1,
                msg: "success",
                require_document: await data1,
                existing_document: await data2
            })

        })
    } else {
        res.status(200).json({
            ack: 0,
            msg: "Empty Fields "
        })
    }


}

Applicant.regDocumentUpload = (req, res) => {

    let filename = req.file.filename;
    let typeId = req.body.type_id;
    let regId = req.body.reg_id;
    let number = req.body.number

    const url = filename;

    dbHelper.connect((err) => {
        const query = `SELECT * FROM documents WHERE document_typeid = ? AND document_parent = ? AND document_for = ?`;
        const replacement = [typeId, regId, "REG"];

        dbHelper.query(query, replacement, (err, result, fields) => {
            if (result.length) {


                dbHelper.query(`SELECT * FROM documents WHERE document_parent = ? AND document_for = ? AND document_typeid = ?`, [regId, "REG", typeId], (err, results, fields) => {
                    if (results.length) {
                        let l = results[0].document_url;
                        try {
                            if (fs.existsSync(`${dir}${l}`)) {
                                fs.unlinkSync(`${dir}${l}`)
                            }
                        } catch (e) {

                        }
                    }
                })

                dbHelper.query(`UPDATE documents SET document_number = '${number}',document_typeid='${typeId}',document_url='${url}',document_active = '1' WHERE document_parent='${regId}' AND document_for = 'REG' AND document_typeid = '${typeId}'`, (err, results, fields) => {
                    res.status(200).json({
                        ack: 1,
                        msg: "document has updated successfully "
                    })
                });

            } else {
                let q = `INSERT INTO documents (document_number,document_for,document_parent,document_typeid,document_url,document_active) VALUES ('${number}','REG','${regId}','${typeId}','${url}','1')`
                dbHelper.query(q, (err, result1, fields) => {
                    res.status(200).json({
                        ack: 1,
                        msg: "document has inserted successfully "
                    })
                })
            }
        });
    })

}

Applicant.omdDocumentUpload = (req, res) => {

    let filename = req.file.filename;
    let typeId = req.body.type_id;
    let omdId = req.body.omd_id;
    let number = req.body.number

    const url = filename;

    dbHelper.connect((err) => {
        const query = `SELECT * FROM documents WHERE document_typeid = ? AND document_parent = ? AND document_for = ?`;
        const replacement = [typeId, omdId, "OMD"];

        dbHelper.query(query, replacement, (err, result, fields) => {
            if (result.length) {

                dbHelper.query(`SELECT * FROM documents WHERE document_parent = ? AND document_for = ? AND document_typeid = ?`, [omdId, "OMD", typeId], (err, results, fields) => {
                    if (results.length) {
                        let l = results[0].document_url;
                        try {
                            if (fs.existsSync(`${dir}${l}`)) {
                                fs.unlinkSync(`${dir}${l}`)
                            }
                        } catch (e) {

                        }
                    }
                })

                dbHelper.query(`UPDATE documents SET document_number = '${number}',document_typeid='${typeId}',document_url='${url}',document_active = '1',document_date='${Applicant.date()}' WHERE document_parent='${omdId}' AND document_for = 'OMD' AND document_typeid = '${typeId}'`, (err, results, fields) => {
                    res.status(200).json({
                        ack: 1,
                        msg: "document has updated successfully "
                    })
                });

            } else {

                let q = `INSERT INTO documents SET ? `
                let data = {
                    document_number: number,
                    document_for: "OMD",
                    document_parent: omdId,
                    document_typeid: typeId,
                    document_url: url,
                    document_active: 1,
                    document_date: Applicant.date()
                }
                dbHelper.query(q, data, (err, result1, fields) => {
                    res.status(200).json({
                        ack: 1,
                        msg: "document has inserted successfully "
                    })
                })
            }
        });
    })

}

Applicant.omdTypology = (req, res) => {
    dbHelper.connect((err) => {
        dbHelper.query(`SELECT * FROM omd_typology`, null, (err, result, fields) => {
            res.status(200).json({
                ack: 1,
                msg: "Omd Typology ",
                data: result
            })
        })
    })
}

Applicant.omdSubTypology = (req, res) => {
    const typologyId = req.body.typology_id;
    if (typologyId) {
        dbHelper.connect((err) => {
            dbHelper.query(`SELECT * FROM omd_subcategory WHERE omd_subcategory_typology = ?`, [typologyId], (err, result, fields) => {
                if (result.length) {
                    res.status(200).json({
                        ack: 1,
                        msg: "Omd Sub-Typology ",
                        data: result
                    })
                } else {
                    res.status(200).json({
                        ack: 0,
                        msg: "No Data Found "
                    })
                }
            })
        })
    } else {
        res.status(200).json({
            ack: 0,
            msg: "Empty Fields "
        })
    }

}

Applicant.getAllCount = (req, res) => {
    dbHelper.connect(async (err) => {

        const allRegistration = new Promise((resolve, reject) => {
            dbHelper.query(`SELECT COUNT(*) AS allregistration FROM registrations`, null, (err, result, fields) => {
                resolve(result[0].allregistration);
            })
        });

        const allRegistrationApprove = new Promise((resolve, reject) => {
            dbHelper.query(`SELECT COUNT(*) AS allregistrationapprove FROM registrations WHERE registration_approved = ?`, [1], (err, result, fields) => {
                resolve(result[0].allregistrationapprove);
            })
        });

        const allOmd = new Promise((resolve, reject) => {
            dbHelper.query(`SELECT COUNT(*) AS allomd FROM omd_application `, null, (err, result, fields) => {
                resolve(result[0].allomd);
            })
        });

        const allOmdApproved = new Promise((resolve, reject) => {
            dbHelper.query(`SELECT COUNT(*) AS allomdapprove FROM omd_application WHERE omd_app_competent_status = ?`, [1], (err, result, fields) => {
                resolve(result[0].allomdapprove);
            })
        });

        res.status(200).json({
            ack: 1,
            msg: "success",
            all_registration: await allRegistration,
            all_approve_registration: await allRegistrationApprove,
            all_omd: await allOmd,
            all_approve_omd: await allOmdApproved
        })

    })
}

Applicant.viewOmd = (req, res) => {
    const regId = req.body.reg_id;
    if (regId) {
        dbHelper.connect((err) => {
            dbHelper.query(`select a.*,b.omd_typology_name,b.omd_typology_id as typology_id from omd_application a INNER JOIN omd_typology b ON a.omd_app_typology = b.omd_typology_id WHERE a.omd_app_regid = ?`, [regId], (err, results, fields) => {
                    if (results.length) {

                        let a = [];
                        results.forEach((v) => {
                            a.push({
                                id: v.omd_app_id,
                                omd_uniqueid: v.omd_uniqueid,
                                regid: v.omd_app_regid,
                                address: v.omd_app_address,
                                pincode: v.omd_app_pincode,
                                zone: v.omd_app_zone,
                                ward: v.omd_app_ward,
                                longitude: v.omd_app_longitude,
                                latitude: v.omd_app_latitude,
                                exact_address: v.omd_app_extract_address,
                                typology: v.omd_app_typology,
                                subcategory: v.omd_app_subcategory,
                                illumination: v.omd_app_illumination,
                                illumination_des: v.omd_app_illumination_des,
                                description: v.omd_app_description,
                                sides: v.omd_app_sides,
                                width: v.omd_app_width,
                                height: v.omd_app_height,
                                format: v.omd_app_format,
                                installation_type: v.omd_app_installation_type,
                                duration: v.omd_app_duration,
                                ip: v.omd_app_ip,
                                datetime: v.omd_app_datetime,
                                scrutiny_status: v.omd_app_scrutiny_status,
                                ae_status: v.omd_app_ae_status,
                                zonal_status: v.omd_app_zonal_status,
                                competent_status: v.omd_app_competent_status,
                                processing_fee_txn: v.omd_app_processing_fee_txn,
                                omd_typology_name: v.omd_typology_name,
                                total_area: (parseInt(v.omd_app_height) * parseInt(v.omd_app_width) * parseInt(v.omd_app_sides)),
                                typology_id: v.typology_id
                            })
                        })

                        res.status(200).json({
                            ack: 1,
                            msg: "data found ",
                            data: a
                        })
                    } else {
                        res.status(200).json({
                            ack: 0,
                            msg: "no Data found "
                        })
                    }
                }
            )
        })
    } else {
        res.status(200).json({
            ack: 0,
            msg: "Empty Fields "
        })
    }
}

Applicant.viewFullOmd = (req, res) => {
    const omdId = req.body.id;
    if (omdId) {
        dbHelper.connect((err) => {
            dbHelper.query(`select * from omd_application a INNER JOIN omd_typology b ON a.omd_app_typology = b.omd_typology_id LEFT JOIN  omd_subcategory c ON a.omd_app_subcategory = c.omd_subcategory_id WHERE a.omd_app_id = ?`, [omdId], async (err, results, fields) => {
                    if (results.length) {

                        let v = results[0];
                        const documents = new Promise((resolve, reject) => {
                            dbHelper.query(`SELECT * FROM documents a INNER JOIN required_document_type b ON a.document_typeid = b.required_document_id WHERE a.document_parent = ? AND a.document_for = ? `, [omdId, "OMD"], (err, results, fields) => {
                                if (results.length) {
                                    resolve(results)
                                } else {
                                    resolve([]);
                                }
                            })
                        });
                        const emis = new Promise((resolve, reject) => {
                            dbHelper.query(`SELECT * FROM omd_app_emi WHERE oae_appid = ?  `, [omdId], (err, results, fields) => {
                                if (results.length) {
                                    resolve(results)
                                } else {
                                    resolve([]);
                                }
                            })
                        });
                        let data = {
                            id: v.omd_app_id,
                            omd_uniqueid: v.omd_uniqueid,
                            regid: v.omd_app_regid,
                            address: v.omd_app_address,
                            pincode: v.omd_app_pincode,
                            zone: v.omd_app_zone,
                            ward: v.omd_app_ward,
                            longitude: v.omd_app_longitude,
                            latitude: v.omd_app_latitude,
                            exact_address: v.omd_app_extract_address,
                            typology: v.omd_app_typology,
                            subcategory: v.omd_app_subcategory,
                            illumination: v.omd_app_illumination,
                            illumination_des: v.omd_app_illumination_des,
                            description: v.omd_app_description,
                            sides: v.omd_app_sides,
                            width: v.omd_app_width,
                            height: v.omd_app_height,
                            format: v.omd_app_format,
                            installation_type: v.omd_app_installation_type,
                            duration: v.omd_app_duration,
                            ip: v.omd_app_ip,
                            datetime: v.omd_app_datetime,
                            scrutiny_status: v.omd_app_scrutiny_status,
                            ae_status: v.omd_app_ae_status,
                            zonal_status: v.omd_app_zonal_status,
                            competent_status: v.omd_app_competent_status,
                            processing_fee_txn: v.omd_app_processing_fee_txn,
                            omd_typology_name: v.omd_typology_name,
                            total_area: (parseInt(v.omd_app_height) * parseInt(v.omd_app_width) * parseInt(v.omd_app_sides)),
                            typology_id: v.omd_typology_id,
                            typology_name: v.omd_typology_name,
                            typology_group: v.omd_typology_group,
                            typology_desc: v.omd_typology_description,
                            sub_category_name: v.omd_subcategory_name,
                            documents: await documents,
                            emi: await emis
                        }

                        res.status(200).json({
                            ack: 1,
                            msg: "data found ",
                            data: data
                        })
                    } else {
                        res.status(200).json({
                            ack: 0,
                            msg: "no Data found "
                        })
                    }
                }
            )
        })
    } else {
        res.status(200).json({
            ack: 0,
            msg: "Empty Fields "
        })
    }
}

Applicant.practise = (req, res) => {
    res.status(200).json({
        ack: 1,
        data: JSON.stringify(req.socket.remoteAddress) || null
    })
}


module.exports = Applicant