package com.msil.iteadeptportal.attendance.service;

import com.msil.iteadeptportal.attendance.api.HolidayDTO;
import com.msil.iteadeptportal.attendance.model.Holiday;
import com.msil.iteadeptportal.attendance.repository.HolidayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class HolidayService {

    private final HolidayRepository holidayRepository;

    @Transactional(readOnly = true)
    public List<HolidayDTO> getHolidays(LocalDate fromDate, LocalDate toDate) {
        LocalDate from = fromDate != null ? fromDate : LocalDate.now().withDayOfYear(1);
        LocalDate to   = toDate   != null ? toDate   : LocalDate.now().withDayOfYear(LocalDate.now().lengthOfYear());

        return holidayRepository.findByHolidayDateBetweenOrderByHolidayDateAsc(from, to)
                .stream()
                .map(h -> HolidayDTO.builder()
                        .holidayId(h.getHolidayId())
                        .holidayDate(h.getHolidayDate())
                        .holidayName(h.getHolidayName())
                        .isOptional(h.getIsOptional())
                        .build())
                .collect(Collectors.toList());
    }
}
