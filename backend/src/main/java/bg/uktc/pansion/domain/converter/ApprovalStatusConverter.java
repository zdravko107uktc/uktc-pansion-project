package bg.uktc.pansion.domain.converter;

import bg.uktc.pansion.domain.enums.ApprovalStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ApprovalStatusConverter implements AttributeConverter<ApprovalStatus, String> {

    @Override
    public String convertToDatabaseColumn(ApprovalStatus attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public ApprovalStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ApprovalStatus.fromValue(dbData);
    }
}
