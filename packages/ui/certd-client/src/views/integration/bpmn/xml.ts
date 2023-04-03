export const demoXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:camunda="http://camunda.org/schema/1.0/bpmn" id="Definitions_Process_1679537772748" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1679537772748" name="业务流程_1679537772748" isExecutable="true">
    <bpmn:startEvent id="Event_0u7us6f"><bpmn:outgoing>Flow_0z7lqtc</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:sequenceFlow id="Flow_0z7lqtc" sourceRef="Event_0u7us6f" targetRef="Activity_1evmidl" />
    <bpmn:userTask id="Activity_08zwh5z" name="二级审批" camunda:candidateGroups="1" camunda:userType="candidateGroups">
      <bpmn:incoming>Flow_1rf2bmg</bpmn:incoming><bpmn:outgoing>Flow_06ulhtm</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_1xxl1vf" sourceRef="Activity_1evmidl" targetRef="Gateway_01mlwlp" />
    <bpmn:userTask id="Activity_1evmidl" name="一级审批" camunda:candidateGroups="2" camunda:userType="candidateGroups">
      <bpmn:incoming>Flow_0z7lqtc</bpmn:incoming><bpmn:incoming>Flow_1p9en55</bpmn:incoming><bpmn:outgoing>Flow_1xxl1vf</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="Event_0lu13jx"><bpmn:incoming>Flow_06ulhtm</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_06ulhtm" sourceRef="Activity_08zwh5z" targetRef="Event_0lu13jx" />
    <bpmn:exclusiveGateway id="Gateway_01mlwlp"><bpmn:incoming>Flow_1xxl1vf</bpmn:incoming><bpmn:outgoing>Flow_1rf2bmg</bpmn:outgoing><bpmn:outgoing>Flow_11pwko7</bpmn:outgoing></bpmn:exclusiveGateway>
    <bpmn:sequenceFlow id="Flow_1rf2bmg" sourceRef="Gateway_01mlwlp" targetRef="Activity_08zwh5z" />
    <bpmn:sequenceFlow id="Flow_11pwko7" sourceRef="Gateway_01mlwlp" targetRef="Activity_15z3qp6" />
    <bpmn:userTask id="Activity_15z3qp6" name="修改" camunda:userType="assignUser" camunda:assignUser="2">
      <bpmn:incoming>Flow_11pwko7</bpmn:incoming><bpmn:outgoing>Flow_1p9en55</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_1p9en55" sourceRef="Activity_15z3qp6" targetRef="Activity_1evmidl" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1679537772748"><bpmndi:BPMNShape id="Event_0u7us6f_di" bpmnElement="Event_0u7us6f"><dc:Bounds x="252" y="172" width="36" height="36" /></bpmndi:BPMNShape><bpmndi:BPMNShape id="Activity_0qkxfyi_di" bpmnElement="Activity_1evmidl"><dc:Bounds x="388" y="130" width="120" height="120" /><bpmndi:BPMNLabel /></bpmndi:BPMNShape><bpmndi:BPMNShape id="Activity_08zwh5z_di" bpmnElement="Activity_08zwh5z"><dc:Bounds x="730" y="130" width="120" height="120" /><bpmndi:BPMNLabel /></bpmndi:BPMNShape><bpmndi:BPMNShape id="Gateway_01mlwlp_di" bpmnElement="Gateway_01mlwlp" isMarkerVisible="true"><dc:Bounds x="595" y="165" width="50" height="50" /></bpmndi:BPMNShape><bpmndi:BPMNShape id="Activity_0qiby6r_di" bpmnElement="Activity_15z3qp6"><dc:Bounds x="560" y="350" width="120" height="120" /><bpmndi:BPMNLabel /></bpmndi:BPMNShape><bpmndi:BPMNShape id="Event_0lu13jx_di" bpmnElement="Event_0lu13jx"><dc:Bounds x="952" y="172" width="36" height="36" /></bpmndi:BPMNShape><bpmndi:BPMNEdge id="Flow_0z7lqtc_di" bpmnElement="Flow_0z7lqtc"><di:waypoint x="288" y="190" /><di:waypoint x="388" y="190" /></bpmndi:BPMNEdge><bpmndi:BPMNEdge id="Flow_1xxl1vf_di" bpmnElement="Flow_1xxl1vf"><di:waypoint x="508" y="190" /><di:waypoint x="595" y="190" /></bpmndi:BPMNEdge><bpmndi:BPMNEdge id="Flow_06ulhtm_di" bpmnElement="Flow_06ulhtm"><di:waypoint x="850" y="190" /><di:waypoint x="952" y="190" /></bpmndi:BPMNEdge><bpmndi:BPMNEdge id="Flow_1rf2bmg_di" bpmnElement="Flow_1rf2bmg"><di:waypoint x="645" y="190" /><di:waypoint x="730" y="190" /></bpmndi:BPMNEdge><bpmndi:BPMNEdge id="Flow_11pwko7_di" bpmnElement="Flow_11pwko7"><di:waypoint x="620" y="215" /><di:waypoint x="620" y="350" /></bpmndi:BPMNEdge><bpmndi:BPMNEdge id="Flow_1p9en55_di" bpmnElement="Flow_1p9en55"><di:waypoint x="560" y="410" /><di:waypoint x="448" y="410" /><di:waypoint x="448" y="250" /></bpmndi:BPMNEdge></bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
