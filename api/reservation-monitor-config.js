export const reservationMonitors = [
  {
    id: 'knps-woraksan-songgye-2026-06-13-1n',
    service: '국립공원공단',
    campground: '월악산 송계야영장',
    period: '2026.06.13 토요일',
    condition: '1박 빈자리 알림',
    url: 'https://reservation.knps.or.kr/contents/C/serviceGuide.do?deptId=B111002&parkId=B11&prdDvcd=C',
    alertStatuses: ['available'],
  },
  {
    // 숲나들e: detected inside the 서울/인천/경기 region list (hmpgId 0101 -> region 1, 유명산).
    id: 'forest-yumyeongsan-2026-06-13-1n',
    service: '숲나들e',
    campground: '유명산 자연휴양림',
    period: '2026.06.13 토요일',
    condition: '1박 빈자리 알림',
    url: 'https://www.foresttrip.go.kr/pot/rm/fa/selectCmpgrArmpListView.do?hmpgId=0101&menuId=002002002',
    alertStatuses: ['available'],
  },
]

