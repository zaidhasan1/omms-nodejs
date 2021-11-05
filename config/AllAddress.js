const applicant = require("../controller/Applicant")

module.exports = [
    {
        link: "/applicant/login",
        func: applicant.login,
        method: "post"
    },
    {
        link: "/applicant/registration",
        func: applicant.registration,
        method: "post"
    },
    {
        link: "/applicant/edit-registration",
        func: applicant.editRegistration,
        method: "put"
    },
    {
        link: "/applicant/get-registration",
        func: applicant.getRegistration,
        method: "post"
    },
    {
        link: "/applicant/get-zone",
        func: applicant.getZone,
        method: "get"
    },
    {
        link: "/applicant/get-ward",
        func: applicant.getWard,
        method: "post"
    },
    {
        link: "/applicant/sendEmailLink",
        func: applicant.sendEmailLink,
        method: "post"
    },
    {
        link: "/applicant/sendMobileLink",
        func: applicant.sendMobileLink,
        method: "post"
    },
    {
        link: "/applicant/getReqDocument",
        func: applicant.getReqDocument,
        method: "post"
    },
    {
        link: "/applicant/omdTypology",
        func: applicant.omdTypology,
        method: "get"
    },
    {
        link: "/applicant/omdSubTypology",
        func: applicant.omdSubTypology,
        method: "post"
    },
    {
        link: "/applicant/getAllCount",
        func: applicant.getAllCount,
        method: "get"
    },
    {
        link: "/applicant/applyOmdApplication",
        func: applicant.applyOmdApplication,
        method: "post"
    },
    {
      link : "/applicant/practise",
      func : applicant.practise,
      method : "get"
    },
    {
        link : "/applicant/view-omd",
        func : applicant.viewOmd,
        method : "post"
    },
    {
        link : "/applicant/view-full-omd",
        func : applicant.viewFullOmd,
        method : "post"
    }
];