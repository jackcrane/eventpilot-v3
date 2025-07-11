import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useFormResponse } from "../../hooks/useFormResponse";
import { Typography, Util, Button, Badge, useOffcanvas } from "tabler-react-2";
import { FormConsumer } from "../formConsumer/FormConsumer";
import { Row } from "../../util/Flex";
import { FromNow } from "../fromNow";
import { Icon } from "../../util/Icon";
import { utc } from "../tzDateTime/valueToUtc";
import moment from "moment-timezone";
import { ShiftFinder } from "../shiftFinder/ShiftFinder";

const STATE_TO_CODE = {
  alaska: "AK",
  alabama: "AL",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  district_of_columbia: "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  new_hampshire: "NH",
  new_jersey: "NJ",
  new_mexico: "NM",
  new_york: "NY",
  north_carolina: "NC",
  north_dakota: "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  rhode_island: "RI",
  south_carolina: "SC",
  south_dakota: "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  west_virginia: "WV",
  wisconsin: "WI",
  wyoming: "WY",
};
const BROWSER_TO_ICON = {
  chrome: (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="#4285F4"
      height={14}
    >
      <title>Google Chrome</title>
      <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728Z" />
    </svg>
  ),
  safari: (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="#006CFF"
      height={14}
    >
      <title>Safari</title>
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm-.004.953h.006c.063 0 .113.05.113.113v1.842c0 .063-.05.113-.113.113h-.006a.112.112 0 0 1-.113-.113V1.066c0-.063.05-.113.113-.113zm-.941.041c.056.001.104.046.11.104l.077.918a.112.112 0 0 1-.101.12h-.01a.11.11 0 0 1-.12-.1l-.08-.919a.112.112 0 0 1 .102-.12h.01l.012-.003zm1.892 0H12.965a.113.113 0 0 1 .103.121l-.08.92a.111.111 0 0 1-.12.102h-.009a.111.111 0 0 1-.101-.121l.078-.92a.112.112 0 0 1 .111-.102zm-2.838.123a.11.11 0 0 1 .106.092l.32 1.818c.01.06-.03.119-.09.13l-.01.001a.111.111 0 0 1-.128-.09l-.32-1.818a.111.111 0 0 1 .09-.129l.01-.002a.103.103 0 0 1 .022-.002zm3.784.002h.021l.008.002c.061.01.102.07.092.131l-.32 1.814c-.011.062-.07.101-.132.09h-.005a.113.113 0 0 1-.092-.13l.32-1.815a.111.111 0 0 1 .108-.092zm-4.715.203c.048.002.09.035.103.084l.239.893a.112.112 0 0 1-.079.139l-.005.001a.114.114 0 0 1-.14-.08l-.237-.894a.11.11 0 0 1 .078-.137l.006-.002a.123.123 0 0 1 .035-.004zm5.644 0a.11.11 0 0 1 .033.004l.006.002c.06.016.097.079.08.139l-.24.892a.112.112 0 0 1-.137.08l-.005-.002a.114.114 0 0 1-.08-.138l.24-.893a.112.112 0 0 1 .103-.084zm-6.562.285a.11.11 0 0 1 .107.073L9 3.42a.107.107 0 0 1-.064.139l-.012.005a.11.11 0 0 1-.14-.066L8.15 1.76a.11.11 0 0 1 .065-.14l.014-.005a.106.106 0 0 1 .03-.008zm7.469.002c.014 0 .028.001.042.006l.012.006c.057.02.087.082.067.139l-.633 1.738a.11.11 0 0 1-.14.066l-.013-.003A.11.11 0 0 1 15 3.42l.633-1.738a.108.108 0 0 1 .096-.073zm-8.352.366a.112.112 0 0 1 .105.064l.393.838a.112.112 0 0 1-.055.148l-.008.004a.11.11 0 0 1-.146-.054l-.395-.838a.112.112 0 0 1 .055-.149l.008-.004a.11.11 0 0 1 .043-.01zm9.246 0a.11.11 0 0 1 .043.01l.006.003a.11.11 0 0 1 .053.149l-.391.838a.112.112 0 0 1-.148.054l-.006-.002a.112.112 0 0 1-.055-.148l.393-.84a.112.112 0 0 1 .105-.064zm-10.092.44c.04-.002.08.018.102.056l.922 1.597a.113.113 0 0 1-.041.155l-.006.002a.113.113 0 0 1-.154-.041l-.922-1.598a.113.113 0 0 1 .04-.154l.007-.002a.11.11 0 0 1 .052-.016zm10.94.001c.018 0 .035.004.052.014l.004.002a.114.114 0 0 1 .041.156l-.923 1.596a.114.114 0 0 1-.157.04l-.004-.001a.112.112 0 0 1-.04-.155l.925-1.595a.113.113 0 0 1 .102-.057zM5.729 2.93a.11.11 0 0 1 .093.047l.532.753a.114.114 0 0 1-.028.159l-.004.002a.114.114 0 0 1-.158-.028l-.531-.752a.114.114 0 0 1 .027-.158l.006-.002a.113.113 0 0 1 .063-.021zm12.542 0a.11.11 0 0 1 .063.02l.006.003a.112.112 0 0 1 .027.156l-.531.756a.112.112 0 0 1-.156.028l-.006-.004a.112.112 0 0 1-.028-.157l.532-.755a.11.11 0 0 1 .093-.047zm.747.578a.11.11 0 0 1 .08.027l.006.004c.047.04.053.111.013.158L17.932 5.11a.11.11 0 0 1-.157.016l-.005-.006a.11.11 0 0 1-.014-.156l1.185-1.414a.114.114 0 0 1 .077-.041zM4.984 3.51a.11.11 0 0 1 .077.039L6.244 4.96a.112.112 0 0 1-.014.158l-.003.004a.112.112 0 0 1-.159-.014L4.883 3.697a.112.112 0 0 1 .013-.158l.006-.004a.111.111 0 0 1 .082-.025zm-.714.64c.027 0 .055.01.076.032l.658.66a.107.107 0 0 1 0 .152l-.01.01a.107.107 0 0 1-.152 0l-.66-.658a.11.11 0 0 1 0-.155l.01-.01a.111.111 0 0 1 .078-.03zm15.462 0c.028 0 .055.01.077.032l.007.007a.109.109 0 0 1 0 .155l-.658.66a.109.109 0 0 1-.154 0l-.008-.008a.109.109 0 0 1 0-.154l.658-.66a.11.11 0 0 1 .078-.032zm.707.66c.038 0 .071.02.092.075a.112.112 0 0 1-.023.117l-7.606 8.08c-3.084 2.024-6.149 4.04-9.222 6.05-.078.051-.17.082-.211-.028a.112.112 0 0 1 .023-.118l7.594-8.08c3.084-2.023 6.161-4.039 9.234-6.049a.247.247 0 0 1 .12-.046zm-16.824.045a.109.109 0 0 1 .08.026l1.416 1.187a.11.11 0 0 1 .014.157l-.006.005a.11.11 0 0 1-.156.014L3.549 5.057a.109.109 0 0 1-.014-.155l.006-.007a.108.108 0 0 1 .074-.04zm17.336.756c.036 0 .072.017.094.05l.004.003a.114.114 0 0 1-.028.158l-.753.53a.112.112 0 0 1-.157-.028l-.004-.004a.114.114 0 0 1 .028-.158l.754-.53a.113.113 0 0 1 .062-.02zm-17.904.002c.02 0 .042.007.06.02l.76.531c.05.035.06.103.026.152l-.006.01a.109.109 0 0 1-.153.026l-.76-.532a.109.109 0 0 1-.025-.152l.006-.01a.108.108 0 0 1 .092-.045zm-.512.803c.018 0 .036.006.053.016l1.596.923a.111.111 0 0 1 .04.153l-.003.006a.111.111 0 0 1-.153.04L2.473 6.63a.111.111 0 0 1-.041-.152l.004-.006a.11.11 0 0 1 .1-.055zm18.932 0a.11.11 0 0 1 .1.055l.001.004a.113.113 0 0 1-.04.154l-1.596.926a.113.113 0 0 1-.155-.041l-.002-.004a.113.113 0 0 1 .041-.155l1.596-.925a.115.115 0 0 1 .055-.014zm-19.373.846c.014 0 .029.003.043.01l.838.392a.11.11 0 0 1 .052.147l-.004.01a.11.11 0 0 1-.146.052l-.838-.393a.11.11 0 0 1-.053-.146l.004-.01a.109.109 0 0 1 .104-.062zm19.81.002a.11.11 0 0 1 .106.062l.002.008a.11.11 0 0 1-.053.146l-.838.393a.11.11 0 0 1-.146-.053l-.004-.008a.11.11 0 0 1 .052-.146l.838-.393a.11.11 0 0 1 .043-.01zm-20.183.88c.014 0 .028.001.043.006l1.732.631a.112.112 0 0 1 .067.145l-.002.006a.11.11 0 0 1-.143.066l-1.732-.63a.113.113 0 0 1-.069-.145l.002-.004a.115.115 0 0 1 .102-.074zm20.549 0a.113.113 0 0 1 .11.075l.003.004a.115.115 0 0 1-.069.146l-1.732.629a.112.112 0 0 1-.145-.066l-.001-.006a.113.113 0 0 1 .068-.145l1.732-.63a.11.11 0 0 1 .034-.006zm-20.836.909a.11.11 0 0 1 .033.004l.892.24c.06.016.096.077.08.137l-.002.007a.11.11 0 0 1-.136.079l-.895-.239a.113.113 0 0 1-.078-.138l.002-.006a.113.113 0 0 1 .104-.084zm21.13.002a.115.115 0 0 1 .106.084v.004a.112.112 0 0 1-.078.138l-.893.239a.112.112 0 0 1-.138-.079v-.005a.112.112 0 0 1 .078-.14l.892-.237a.11.11 0 0 1 .033-.004zm-21.335.93.023.001 1.814.323c.062.01.101.069.09.13v.006a.111.111 0 0 1-.13.09l-1.815-.322a.113.113 0 0 1-.092-.131l.002-.006a.11.11 0 0 1 .108-.092zm21.519.001h.022c.052.002.1.038.109.092v.006c.01.062-.03.12-.092.13l-1.814.321a.113.113 0 0 1-.131-.092v-.005a.113.113 0 0 1 .092-.131l1.814-.32zm-21.644.944h.011l.922.084a.11.11 0 0 1 .102.119l-.002.01a.11.11 0 0 1-.121.1l-.922-.083a.11.11 0 0 1-.1-.12v-.009a.111.111 0 0 1 .11-.101zm21.779.002h.012c.056 0 .106.043.11.101v.008a.111.111 0 0 1-.1.121l-.923.08a.111.111 0 0 1-.12-.101v-.008a.111.111 0 0 1 .1-.121l.92-.08zm-11.82.73L6.091 16.95c2.02-1.324 4.039-2.646 6.066-3.976l-1.095-1.31zm11.87.219c.063 0 .114.05.114.113v.004c0 .063-.05.113-.113.113l-1.844.004a.113.113 0 0 1-.113-.113v-.004c0-.063.05-.113.113-.113l1.844-.004zm-21.869.002h1.844c.062 0 .112.05.112.111v.008c0 .062-.05.111-.112.111H1.064a.111.111 0 0 1-.11-.111v-.008c0-.061.049-.111.11-.111zm.952.875h.011a.11.11 0 0 1 .11.101v.006a.111.111 0 0 1-.102.121l-.922.08a.11.11 0 0 1-.119-.101l-.002-.006a.111.111 0 0 1 .102-.121l.922-.08zm19.955 0h.011l.922.08a.11.11 0 0 1 .102.119v.008a.112.112 0 0 1-.121.101l-.922-.08a.11.11 0 0 1-.102-.119v-.008a.111.111 0 0 1 .11-.101zm-18.924.705c.053.001.098.04.107.094l.002.004c.011.061-.03.12-.092.13l-1.812.32a.113.113 0 0 1-.13-.091v-.004a.115.115 0 0 1 .09-.133l1.811-.318a.117.117 0 0 1 .024-.002zm17.902 0c.008 0 .016 0 .024.002l1.816.32c.061.011.1.07.09.131v.004a.113.113 0 0 1-.131.092l-1.816-.32a.112.112 0 0 1-.09-.131v-.004a.113.113 0 0 1 .107-.094zM2.332 14.477a.11.11 0 0 1 .104.082l.002.005c.016.06-.02.121-.08.137l-.891.24a.112.112 0 0 1-.137-.08l-.002-.006a.112.112 0 0 1 .08-.136l.89-.239a.112.112 0 0 1 .034-.003zm19.332 0c.011 0 .024 0 .035.003l.893.239c.06.016.096.077.08.136l-.002.006a.111.111 0 0 1-.137.078l-.894-.238a.111.111 0 0 1-.078-.137l.002-.005a.109.109 0 0 1 .101-.082zm-18.213.517a.11.11 0 0 1 .11.074l.002.004a.112.112 0 0 1-.067.145l-1.732.63a.113.113 0 0 1-.145-.068l-.002-.004a.113.113 0 0 1 .069-.144L3.418 15a.11.11 0 0 1 .033-.006zm17.086 0c.015 0 .029 0 .043.006l1.734.63a.111.111 0 0 1 .067.143l-.002.008a.111.111 0 0 1-.143.067l-1.734-.631a.111.111 0 0 1-.066-.143l.002-.008a.111.111 0 0 1 .1-.072zM2.92 16.117a.109.109 0 0 1 .103.063l.004.01a.108.108 0 0 1-.052.144l-.838.393a.11.11 0 0 1-.147-.055l-.004-.008a.11.11 0 0 1 .053-.146l.838-.391a.112.112 0 0 1 .043-.01zm18.158 0a.11.11 0 0 1 .043.01l.838.39c.056.027.08.093.055.149l-.002.004a.112.112 0 0 1-.149.055l-.838-.391a.112.112 0 0 1-.054-.148l.002-.004a.112.112 0 0 1 .105-.065zm-16.957.315c.04-.001.078.02.1.056l.004.004a.11.11 0 0 1-.041.153l-1.596.921a.113.113 0 0 1-.154-.04l-.002-.005a.113.113 0 0 1 .04-.154l1.596-.922a.109.109 0 0 1 .053-.013zm15.756 0c.018 0 .036.004.053.013l1.597.924a.11.11 0 0 1 .041.152l-.002.004a.11.11 0 0 1-.152.041l-1.598-.921a.113.113 0 0 1-.04-.155l.001-.002a.111.111 0 0 1 .1-.056zm.328 1.193a.11.11 0 0 1 .06.021l.758.534c.05.035.061.102.026.152l-.004.008a.111.111 0 0 1-.154.027l-.756-.535a.109.109 0 0 1-.028-.152l.006-.008a.11.11 0 0 1 .092-.047zm-16.412.002c.035 0 .072.016.094.047l.004.008a.109.109 0 0 1-.028.152l-.756.531a.108.108 0 0 1-.152-.025l-.006-.008a.109.109 0 0 1 .028-.152l.755-.534a.107.107 0 0 1 .061-.019zm15.162.102a.112.112 0 0 1 .082.025l1.414 1.187a.11.11 0 0 1 .014.157l-.004.004a.113.113 0 0 1-.158.013L18.89 17.93a.11.11 0 0 1-.014-.157l.004-.005a.108.108 0 0 1 .074-.04zm-12.812 1.12a.11.11 0 0 1 .08.026l.007.008a.11.11 0 0 1 .014.154L5.06 20.451a.11.11 0 0 1-.155.012l-.008-.006a.11.11 0 0 1-.013-.154l1.185-1.414a.11.11 0 0 1 .075-.04zm11.703 0c.032 0 .065.015.088.042l1.181 1.41c.04.048.035.12-.013.16l-.002.002a.114.114 0 0 1-.16-.014l-1.182-1.41a.114.114 0 0 1 .013-.16l.002-.002a.115.115 0 0 1 .073-.027zm-12.928.114c.027 0 .054.01.074.031l.014.012a.107.107 0 0 1 0 .15l-.662.66a.105.105 0 0 1-.149 0l-.011-.011a.105.105 0 0 1 0-.149l.66-.662a.105.105 0 0 1 .074-.031zm14.164 0c.027 0 .053.01.074.031l.66.662a.106.106 0 0 1 0 .15l-.011.012a.106.106 0 0 1-.15-.002l-.66-.66a.106.106 0 0 1 .001-.15l.01-.012a.108.108 0 0 1 .076-.031zm-11.627.797c.018 0 .034.006.05.015l.007.004a.11.11 0 0 1 .04.15l-.921 1.598a.11.11 0 0 1-.15.041l-.008-.004a.111.111 0 0 1-.04-.152l.922-1.596a.113.113 0 0 1 .1-.056zm9.088.002a.11.11 0 0 1 .1.054l.925 1.596a.113.113 0 0 1-.04.154h-.005a.11.11 0 0 1-.152-.039l-.926-1.595a.113.113 0 0 1 .041-.155l.004-.002a.108.108 0 0 1 .053-.013zm-10.285.324c.021 0 .043.008.062.021l.004.002c.051.036.063.106.028.157l-.53.755a.112.112 0 0 1-.156.028l-.004-.002a.112.112 0 0 1-.027-.156l.53-.756a.113.113 0 0 1 .093-.05zm11.484.002c.036 0 .072.015.094.047l.53.756c.035.05.023.12-.028.156l-.004.002a.112.112 0 0 1-.156-.028l-.53-.755a.112.112 0 0 1 .028-.157l.004-.002a.112.112 0 0 1 .062-.02zm-8.863.342a.11.11 0 0 1 .043.006l.012.005c.056.02.084.081.064.137l-.633 1.74a.105.105 0 0 1-.136.063l-.014-.004a.106.106 0 0 1-.065-.137l.633-1.74a.107.107 0 0 1 .096-.07zm6.232 0a.107.107 0 0 1 .106.07l.633 1.738a.107.107 0 0 1-.065.137l-.015.006a.107.107 0 0 1-.137-.065L15 20.578a.107.107 0 0 1 .064-.137l.014-.005a.117.117 0 0 1 .033-.006zm-4.695.41c.008 0 .014 0 .021.002l.006.002c.062.01.101.067.09.129l-.318 1.812a.113.113 0 0 1-.131.092l-.004-.002a.111.111 0 0 1-.092-.129l.32-1.812a.113.113 0 0 1 .108-.094zm3.146.002c.008-.002.015 0 .022 0a.111.111 0 0 1 .107.092l.32 1.812c.012.061-.03.12-.091.131l-.004.002a.113.113 0 0 1-.13-.092l-.321-1.812a.113.113 0 0 1 .092-.131l.005-.002zm-5.79.119a.11.11 0 0 1 .042.01l.004.002a.114.114 0 0 1 .055.15l-.393.834a.112.112 0 0 1-.148.055l-.004-.002a.112.112 0 0 1-.055-.149l.393-.836a.112.112 0 0 1 .105-.064zm8.458 0a.108.108 0 0 1 .104.062l.39.84a.11.11 0 0 1-.052.147l-.008.004a.11.11 0 0 1-.146-.055l-.391-.838a.11.11 0 0 1 .053-.146l.008-.004a.11.11 0 0 1 .042-.01zm-4.236.018H12c.063 0 .115.05.115.113l.002 1.84c0 .063-.05.113-.113.113h-.006a.113.113 0 0 1-.113-.113l-.004-1.838c0-.063.05-.115.113-.115zm-2.592.578c.011 0 .022 0 .034.004l.005.002c.06.016.095.077.079.136l-.24.893a.111.111 0 0 1-.137.078l-.006-.002a.111.111 0 0 1-.078-.137l.24-.89a.113.113 0 0 1 .103-.084zm5.196.002a.11.11 0 0 1 .103.082l.24.89a.11.11 0 0 1-.078.137l-.006.002a.11.11 0 0 1-.136-.078l-.24-.89a.11.11 0 0 1 .078-.138l.005-.002a.112.112 0 0 1 .034-.003zm-3.475.302h.01l.008.002c.061.006.107.06.101.121l-.08.92a.112.112 0 0 1-.121.102h-.008a.11.11 0 0 1-.1-.121l.08-.922a.111.111 0 0 1 .11-.102zm1.736 0h.02a.11.11 0 0 1 .107.102l.08.924a.11.11 0 0 1-.101.119l-.008.002a.11.11 0 0 1-.12-.102l-.08-.924a.112.112 0 0 1 .102-.12z" />
    </svg>
  ),
  arc: (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="#FCBFBD"
      height={14}
    >
      <title>Arc</title>
      <path d="M23.9371 8.5089c.1471-.7147.0367-1.4661-.3364-2.0967-.4203-.7094-1.1035-1.1876-1.9075-1.3506a2.9178 2.9178 0 0 0-.5623-.0578h-.0105c-1.3768 0-2.5329.988-2.8061 2.3385-.1629.7935-.4782 1.5607-.9196 2.2701a.263.263 0 0 1-.2363.1205.2627.2627 0 0 1-.2209-.1468l-2.8587-5.9906c-.3626-.762-1.0142-1.361-1.8235-1.5975-1.3873-.4099-2.8166.2838-3.4052 1.524L5.897 9.7333c-.0788.1629-.31.1576-.3784-.0053v-.0052a2.8597 2.8597 0 0 0-2.6642-1.7972c-.3784 0-.7515.0736-1.1088.2207-1.4714.6148-2.1283 2.349-1.5187 3.8203.557 1.3295 1.4714 2.5855 2.659 3.668.084.0788.1103.1997.063.3048l-.9563 2.0074c-.6727 1.4188-.1314 3.1477 1.2664 3.8571.4099.2049.846.31 1.298.31 1.1035 0 2.123-.6411 2.5959-1.6395l.825-1.7289a.254.254 0 0 1 .3048-.1366c1.0037.2732 2.0127.4204 3.0058.4204 1.1193 0 2.2229-.1682 3.2896-.4782a.2626.2626 0 0 1 .3101.1366l.8145 1.7131c.4834 1.0195 1.4924 1.7131 2.6169 1.7184.4572 0 .8986-.0999 1.3138-.3101 1.403-.7094 1.939-2.4435 1.2664-3.8676L19.875 15.787c-.0473-.1051-.0263-.226.0578-.3048 1.9864-1.8497 3.4525-4.2723 4.0043-6.9733ZM6.2121 20.0172a1.835 1.835 0 0 1-.6764.7622 1.8352 1.8352 0 0 1-.9788.2835c-.2733 0-.5518-.063-.8093-.1891-.9038-.4467-1.2454-1.5713-.8093-2.4804l.7935-1.6658c.0684-.1471.2575-.1997.3837-.1051.1681.1209.3415.2365.5202.3521.6989.4467 1.4293.825 2.1808 1.1351.1419.0578.205.2154.1419.352l-.7462 1.5555Zm5.0763-2.0442c-4.2092 0-8.6548-2.8534-10.1262-6.4951a1.8286 1.8286 0 0 1 1.009-2.3805c.2259-.0893.4571-.1366.683-.1366.7252 0 1.4084.431 1.6974 1.1456.9196 2.2806 4.0043 4.2092 6.7368 4.2092.4204 0 .8408-.042 1.256-.1156a.2643.2643 0 0 1 .2837.1419l1.3768 2.9007c.0683.1471-.0105.3205-.1629.3626-.8986.2365-1.8182.3678-2.7536.3678Zm-.599-4.9291.6358-1.3348c.0526-.1051.205-.1051.2575 0l.6201 1.3033c.042.0841-.0158.1891-.1051.2049-.268.0368-.536.0578-.7988.0578a5.0634 5.0634 0 0 1-.4887-.0263c-.1103-.0157-.1629-.1208-.1208-.2049Zm8.4604 7.8246a1.831 1.831 0 0 1-2.0329-.2788 1.8292 1.8292 0 0 1-.4316-.5778l-4.987-10.4836c-.0998-.2102-.3994-.2102-.4939 0l-1.545 3.2529a.2623.2623 0 0 1-.3205.1366c-1.051-.3626-2.0495-.9774-2.7904-1.7184a.2552.2552 0 0 1-.0473-.2943l3.3421-7.031c.1156-.247.2943-.4677.5203-.6201 1.051-.6884 2.2806-.2575 2.7378.7041l6.8577 14.4248c.4309.9144.0946 2.0389-.8093 2.4856Zm-1.4451-9.6481a.258.258 0 0 1 .0315-.2732c.783-1.0037 1.3558-2.1756 1.6028-3.421.1734-.867.9354-1.4714 1.7919-1.4714.1472 0 .2943.0158.4467.0526.9722.2417 1.5344 1.2507 1.3295 2.2333-.4835 2.3017-1.6816 4.3879-3.3159 6.0222-.1313.1314-.3468.0946-.4256-.0683l-1.4609-3.0742Z" />
    </svg>
  ),
  firefox: (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="#FF7139"
      height={14}
    >
      <title>Firefox Browser</title>
      <path d="M8.824 7.287c.008 0 .004 0 0 0zm-2.8-1.4c.006 0 .003 0 0 0zm16.754 2.161c-.505-1.215-1.53-2.528-2.333-2.943.654 1.283 1.033 2.57 1.177 3.53l.002.02c-1.314-3.278-3.544-4.6-5.366-7.477-.091-.147-.184-.292-.273-.446a3.545 3.545 0 01-.13-.24 2.118 2.118 0 01-.172-.46.03.03 0 00-.027-.03.038.038 0 00-.021 0l-.006.001a.037.037 0 00-.01.005L15.624 0c-2.585 1.515-3.657 4.168-3.932 5.856a6.197 6.197 0 00-2.305.587.297.297 0 00-.147.37c.057.162.24.24.396.17a5.622 5.622 0 012.008-.523l.067-.005a5.847 5.847 0 011.957.222l.095.03a5.816 5.816 0 01.616.228c.08.036.16.073.238.112l.107.055a5.835 5.835 0 01.368.211 5.953 5.953 0 012.034 2.104c-.62-.437-1.733-.868-2.803-.681 4.183 2.09 3.06 9.292-2.737 9.02a5.164 5.164 0 01-1.513-.292 4.42 4.42 0 01-.538-.232c-1.42-.735-2.593-2.121-2.74-3.806 0 0 .537-2 3.845-2 .357 0 1.38-.998 1.398-1.287-.005-.095-2.029-.9-2.817-1.677-.422-.416-.622-.616-.8-.767a3.47 3.47 0 00-.301-.227 5.388 5.388 0 01-.032-2.842c-1.195.544-2.124 1.403-2.8 2.163h-.006c-.46-.584-.428-2.51-.402-2.913-.006-.025-.343.176-.389.206-.406.29-.787.616-1.136.974-.397.403-.76.839-1.085 1.303a9.816 9.816 0 00-1.562 3.52c-.003.013-.11.487-.19 1.073-.013.09-.026.181-.037.272a7.8 7.8 0 00-.069.667l-.002.034-.023.387-.001.06C.386 18.795 5.593 24 12.016 24c5.752 0 10.527-4.176 11.463-9.661.02-.149.035-.298.052-.448.232-1.994-.025-4.09-.753-5.844z" />
    </svg>
  ),
};

export const Dg = ({ title, content, description }) => (
  <div className="datagrid-item">
    <div class="datagrid-title">{title}</div>
    <div class="datagrid-content mb-1">{content}</div>
    {description && (
      <i class="datagrid-description text-muted">{description}</i>
    )}
  </div>
);

export const FormResponseRUD = ({ id, confirm, subOffcanvas }) => {
  const { eventId } = useParams();
  const {
    response,
    fields,
    pii,
    shifts,
    loading,
    error,
    groupedShifts,
    updateResponse,
    deleteResponse,
    mutationLoading,
    deleteLoading,
  } = useFormResponse(eventId, id);

  if (loading) return <div>Loading…</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!response) return <div>Response not found</div>;

  // split & order active fields
  const [existing, not] = fields.reduce(
    ([inForm, notInForm], f) =>
      f.currentlyInForm
        ? [[...inForm, f], notInForm]
        : [inForm, [...notInForm, f]],
    [[], []]
  );
  const ordered = existing.sort((a, b) => a.order - b.order);

  // build initialValues
  const initialValues = {};
  ordered.forEach((f) => {
    initialValues[f.id] = response[f.id] ?? "";
  });

  // strip out deleted options
  const formFields = ordered.map((f) => ({
    ...f,
    options: f.options.filter((o) => !o.deleted),
  }));

  const flattenObjectValues = (obj) => {
    const result = {};

    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === "object" && "id" in value) {
        result[key] = value.id;
      } else {
        result[key] = value;
      }
    });

    return result;
  };

  const _updateResponse = (values) => {
    values = flattenObjectValues(values);
    return updateResponse(values);
  };

  return (
    <div style={{ marginBottom: 100 }}>
      <Typography.H5 className="mb-0 text-secondary">VOLUNTEER</Typography.H5>
      <Typography.H1>{response.flat.name}</Typography.H1>
      <Row gap={1}>
        <span>
          <span className="text-muted">Registered</span>{" "}
          <FromNow date={response.createdAt} />
        </span>
        <Icon i="point" />
        <span>
          <span className="text-muted">Updated</span>{" "}
          <FromNow date={response.updatedAt} />
        </span>
      </Row>
      <Util.Hr text="Form Responses" />
      <FormConsumer
        fields={formFields}
        initialValues={initialValues}
        onSubmit={_updateResponse}
        disabled={mutationLoading}
        loading={mutationLoading}
      />
      <div className="mt-3">
        <Button
          variant="danger"
          outline
          onClick={async () => {
            if (
              await confirm({
                title: "Are you sure you want to delete this submission?",
                text: "This action cannot be undone.",
                commitText: "Delete",
              })
            )
              await deleteResponse();
          }}
          disabled={deleteLoading}
        >
          {deleteLoading ? "Deleting…" : "Delete Submission"}
        </Button>
      </div>
      <Util.Hr text="Shifts" />
      <div>
        {groupedShifts.map((location) => (
          <div key={location.id}>
            <Typography.H3>{location.name}</Typography.H3>
            {location.jobs.map((job) => (
              <div key={job.id} className="mb-2">
                <Typography.H4 className={"mb-0"}>{job.name}</Typography.H4>
                {job.shifts.map((shift) => (
                  <Badge key={shift.id} style={{ marginRight: 8 }} outline>
                    {moment(shift.startTime)
                      .tz(utc(shift.startTimeTz))
                      .format("h:mm a")}
                    {" - "}
                    {moment(shift.endTime)
                      .tz(utc(shift.endTimeTz))
                      .format("h:mm a")}
                  </Badge>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      <Button
        onClick={() =>
          subOffcanvas({
            content: (
              <Shifts
                eventId={eventId}
                shifts={shifts}
                flat={response.flat}
                submissionId={id}
              />
            ),
          })
        }
      >
        View Shifts
      </Button>
      <Util.Hr text="PII & Analytics" />
      <Typography.Text>
        The following information is collected automatically from the device
        that submitted the form. This information can be used to identify users,
        guide marketing efforts, and improve how your event is run.
      </Typography.Text>
      <div className="datagrid">
        <Dg
          title="Fingerprint"
          description="Unique identifier for the browser and device that submitted the form. This can be used to identify multiple users who signed up from the same device, and is useful for tracking spam and fraudulent activity, or for identifying users who have existing relationships between eachother."
          content={<code>{pii?.fingerprint || "-"}</code>}
        />
        {pii?.otherResponsesWithSameFingerprint?.length > 0 && (
          <Dg
            title="Other Responses with Same Fingerprint"
            description="Other responses with the same fingerprint as this response."
            content={pii?.otherResponsesWithSameFingerprint?.map((r) => (
              <>
                <code key={r.id}>{r.name}</code>{" "}
              </>
            ))}
          />
        )}
        <Dg
          title="IP Address"
          content={<code>{pii?.ipAddress || "-"}</code>}
          description="IP address of the device that submitted the form. This can be used to identify multiple users who signed up from the same IP address. It is useful for users using VPNs or proxies, which can lower their trust score."
        />
        <Dg
          title="Location"
          description="Approximate location of the device that submitted the form based on IP address. It is about 80% accurate to the city level, and can have up to a 30 mile radius of error. If the user is using a VPN or proxy, the location may be inaccurate."
          content={
            <Row gap={1}>
              <img
                style={{ height: 14 }}
                src={`https://flagcdn.com/w320/${pii?.location?.country_code?.toLowerCase()}.png`}
                alt={pii?.location?.country_name}
              />
              {pii?.location?.country_code === "US" && pii?.location?.state && (
                <img
                  style={{ height: 14 }}
                  src={`https://flagcdn.com/w320/us-${STATE_TO_CODE[
                    pii?.location?.state?.toLowerCase()
                  ]?.toLowerCase()}.png`}
                  alt={pii?.location?.state}
                />
              )}
              <span>
                {pii?.location?.city}, {pii?.location?.state}
                {", "}
                {pii?.location?.country_name}
              </span>
            </Row>
          }
        />
        <Dg
          title="Timezone"
          content={pii?.tz}
          description="Timezone of the device that submitted the form."
        />
        <Dg
          title="Browser"
          content={
            <Row gap={1}>
              {BROWSER_TO_ICON[pii?.browser?.name?.toLowerCase()]}
              <span>
                {pii?.browser?.name} v{pii?.browser?.version}
              </span>
            </Row>
          }
        />
        <Dg
          title="Device"
          content={
            <span>
              {pii?.device?.vendor && `${pii?.device?.vendor} `}
              {pii?.device?.model}
            </span>
          }
        />
        <Dg
          title="Screen Dimensions"
          content={
            <code>
              {pii?.screenWidth}x{pii?.screenHeight}
            </code>
          }
          description="Screen dimensions of the device that submitted the form. This can be useful to identify users who are using a mobile device, helping guide marketing efforts."
        />
      </div>
    </div>
  );
};

const Shifts = ({ eventId, shifts: passedShifts, flat, submissionId }) => {
  const [shifts, setShifts] = useState(passedShifts);
  const { mutationLoading, updateShiftRegistrations } = useFormResponse(
    eventId,
    submissionId
  );

  const handleSubmit = () => {
    updateShiftRegistrations(shifts);
  };

  useEffect(() => {
    setShifts(passedShifts);
  }, [passedShifts]);

  return (
    <div style={{ position: "relative" }}>
      <Typography.H5 className={"mb-0 text-secondary"}>VOLUNTEER</Typography.H5>
      <Typography.H1>{flat?.name}</Typography.H1>
      <ShiftFinder
        fromRUD={true}
        eventId={eventId}
        onSelectedShiftChange={setShifts}
        shifts={shifts}
      />
      <Button onClick={handleSubmit} loading={mutationLoading}>
        Submit
      </Button>
    </div>
  );
};
